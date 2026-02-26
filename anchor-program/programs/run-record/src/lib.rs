use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::{commit, delegate, ephemeral};
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::commit_and_undelegate_accounts;

// PLACEHOLDER — replace with `solana-keygen pubkey target/deploy/run_record-keypair.json` after build
declare_id!("9rGjguBZAnittA4Cbm7YNP5qomatY3c4MTV7LSqNomzS");

pub const RUN_SEED: &[u8] = b"run";
pub const MAX_EVENTS: usize = 64;

// ── Event Types ───────────────────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum EventType {
    AdvanceRoom,
    Encounter,
    ItemPickup,
    ItemDrop,
    Death,
    Victory,
}

#[account]
#[derive(InitSpace)]
pub struct RunEvent {
    pub event_type: EventType,
    pub room: u8,
    pub timestamp: i64,
    pub data: [u8; 32], // Hashed event payload (VRF seed, outcome, etc.)
}

// ── Run Record ────────────────────────────────────────────────────────────────

#[account]
#[derive(InitSpace)]
pub struct RunRecord {
    pub player: Pubkey,              // Player wallet
    pub authority: Pubkey,           // Server authority (signs record_event)
    pub session_id: [u8; 32],        // Links to InstantDB session
    pub started_at: i64,
    pub current_room: u8,
    pub status: RunStatus,
    pub event_count: u16,
    pub stake_amount: u64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum RunStatus {
    Active,
    Dead,
    Cleared,
}

// ── Program ───────────────────────────────────────────────────────────────────

#[ephemeral]
#[program]
pub mod run_record {
    use super::*;

    /// Initialize a new run record on Solana L1.
    /// Called by server authority at session start, before delegation.
    pub fn initialize_run(
        ctx: Context<InitializeRun>,
        session_id: [u8; 32],
        player: Pubkey,
        stake_amount: u64,
    ) -> Result<()> {
        let run = &mut ctx.accounts.run_record;
        run.player = player;
        run.authority = ctx.accounts.authority.key();
        run.session_id = session_id;
        run.started_at = Clock::get()?.unix_timestamp;
        run.current_room = 0;
        run.status = RunStatus::Active;
        run.event_count = 0;
        run.stake_amount = stake_amount;
        run.bump = ctx.bumps.run_record;

        msg!("Run initialized for player {}", player);
        Ok(())
    }

    /// Delegate the RunRecord PDA to the Ephemeral Rollup.
    /// After this, `record_event` runs on the ER (zero-fee, instant).
    pub fn delegate_run(ctx: Context<DelegateRun>) -> Result<()> {
        ctx.accounts.delegate_run_record(
            &ctx.accounts.authority,
            &[RUN_SEED, ctx.accounts.run_record.session_id.as_ref()],
            DelegateConfig {
                validator: ctx.remaining_accounts.first().map(|a| a.key()),
                ..Default::default()
            },
        )?;
        msg!("RunRecord delegated to ER");
        Ok(())
    }

    /// Record a game event. Runs on the ER (zero-fee).
    /// Signed by server authority — player never needs to sign during gameplay.
    pub fn record_event(
        ctx: Context<RecordEvent>,
        event_type: EventType,
        room: u8,
        data: [u8; 32],
    ) -> Result<()> {
        let run = &mut ctx.accounts.run_record;
        require!(run.status == RunStatus::Active, ErrorCode::RunNotActive);

        run.current_room = room;
        run.event_count = run.event_count.saturating_add(1);

        msg!(
            "Event {:?} at room {} (total events: {})",
            event_type as u8,
            room,
            run.event_count
        );
        Ok(())
    }

    /// Set the run's final status on the ER (without committing).
    /// Called just before the SDK direct commit+undelegate, since that
    /// instruction only flushes state — it doesn't modify data.
    pub fn finalize_run(
        ctx: Context<FinalizeRun>,
        outcome: RunStatus,
        final_room: u8,
    ) -> Result<()> {
        let run = &mut ctx.accounts.run_record;
        require!(run.status == RunStatus::Active, ErrorCode::RunNotActive);

        run.status = outcome;
        run.current_room = final_room;

        msg!("Run finalized: status {:?}, room {}", outcome as u8, final_room);
        Ok(())
    }

    /// Commit the ER run back to L1 and undelegate.
    /// Called at death or victory — this is the settlement gate.
    pub fn commit_run(
        ctx: Context<CommitRun>,
        outcome: RunStatus,
    ) -> Result<()> {
        let run = &mut ctx.accounts.run_record;
        require!(run.status == RunStatus::Active, ErrorCode::RunNotActive);

        run.status = outcome;

        // Serialize updated state before commit
        run.exit(&crate::ID)?;

        // Commit state to L1 and undelegate the account
        commit_and_undelegate_accounts(
            &ctx.accounts.authority,
            vec![&ctx.accounts.run_record.to_account_info()],
            &ctx.accounts.magic_context,
            &ctx.accounts.magic_program,
        )?;

        msg!("Run committed to L1 with status {:?}", outcome as u8);
        Ok(())
    }

    /// Atomically finalize run data and commit+undelegate in one instruction.
    /// This avoids stale-state commits when finalize and commit are split.
    pub fn finalize_and_commit(
        ctx: Context<CommitRun>,
        outcome: RunStatus,
        final_room: u8,
    ) -> Result<()> {
        let run = &mut ctx.accounts.run_record;
        require!(run.status == RunStatus::Active, ErrorCode::RunNotActive);

        run.status = outcome;
        run.current_room = final_room;

        // Serialize latest state before commit
        run.exit(&crate::ID)?;

        // Commit state to L1 and undelegate the account atomically
        commit_and_undelegate_accounts(
            &ctx.accounts.authority,
            vec![&ctx.accounts.run_record.to_account_info()],
            &ctx.accounts.magic_context,
            &ctx.accounts.magic_program,
        )?;

        msg!(
            "Run finalized+committed to L1: status {:?}, room {}",
            outcome as u8,
            final_room
        );
        Ok(())
    }
}

// ── Accounts ──────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(session_id: [u8; 32])]
pub struct InitializeRun<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + RunRecord::INIT_SPACE,
        seeds = [RUN_SEED, session_id.as_ref()],
        bump
    )]
    pub run_record: Account<'info, RunRecord>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[delegate]
#[derive(Accounts)]
pub struct DelegateRun<'info> {
    pub authority: Signer<'info>,

    /// CHECK: The PDA to delegate
    #[account(
        mut,
        del,
        seeds = [RUN_SEED, run_record.session_id.as_ref()],
        bump = run_record.bump
    )]
    pub run_record: Account<'info, RunRecord>,
}

#[derive(Accounts)]
pub struct RecordEvent<'info> {
    #[account(
        mut,
        seeds = [RUN_SEED, run_record.session_id.as_ref()],
        bump = run_record.bump
    )]
    pub run_record: Account<'info, RunRecord>,

    /// Server authority — signs all in-run events (player doesn't need to sign)
    #[account(address = run_record.authority)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct FinalizeRun<'info> {
    #[account(
        mut,
        seeds = [RUN_SEED, run_record.session_id.as_ref()],
        bump = run_record.bump
    )]
    pub run_record: Account<'info, RunRecord>,

    #[account(address = run_record.authority)]
    pub authority: Signer<'info>,
}

#[commit]
#[derive(Accounts)]
pub struct CommitRun<'info> {
    #[account(
        mut,
        seeds = [RUN_SEED, run_record.session_id.as_ref()],
        bump = run_record.bump
    )]
    pub run_record: Account<'info, RunRecord>,

    #[account(address = run_record.authority)]
    pub authority: Signer<'info>,
}

// ── Errors ────────────────────────────────────────────────────────────────────

#[error_code]
pub enum ErrorCode {
    #[msg("Run is not active")]
    RunNotActive,
}
