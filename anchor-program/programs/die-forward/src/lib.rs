use anchor_lang::prelude::*;

declare_id!("3KLgtdRvfJuLK1t9mKCe2soJbx4LgZfP6LQWVW9TQ7yN");

#[program]
pub mod die_forward {
    use super::*;

    /// Initialize the game pool
    pub fn initialize(
        ctx: Context<Initialize>,
        fee_bps: u16,           // Fee in basis points (500 = 5%)
        victory_bonus_bps: u16, // Victory bonus (5000 = 50%)
    ) -> Result<()> {
        require!(fee_bps <= 1000, ErrorCode::FeeTooHigh); // Max 10%
        require!(victory_bonus_bps <= 10000, ErrorCode::BonusTooHigh); // Max 100%

        let pool = &mut ctx.accounts.game_pool;
        pool.authority = ctx.accounts.authority.key();
        pool.treasury = ctx.accounts.treasury.key();
        pool.fee_bps = fee_bps;
        pool.victory_bonus_bps = victory_bonus_bps;
        pool.total_staked = 0;
        pool.total_deaths = 0;
        pool.total_victories = 0;
        pool.bump = ctx.bumps.game_pool;

        msg!("Game pool initialized with {}bps fee, {}bps victory bonus", fee_bps, victory_bonus_bps);
        Ok(())
    }

    /// Player stakes SOL to start a game session
    pub fn stake(
        ctx: Context<Stake>,
        amount: u64,
        session_id: [u8; 32], // Unique session identifier
    ) -> Result<()> {
        require!(amount >= 10_000_000, ErrorCode::StakeTooLow); // Min 0.01 SOL
        require!(amount <= 1_000_000_000, ErrorCode::StakeTooHigh); // Max 1 SOL

        let pool = &ctx.accounts.game_pool;
        
        // Calculate fee
        let fee = amount
            .checked_mul(pool.fee_bps as u64)
            .unwrap()
            .checked_div(10000)
            .unwrap();
        let escrow_amount = amount.checked_sub(fee).unwrap();

        // Transfer fee to treasury
        if fee > 0 {
            anchor_lang::system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: ctx.accounts.player.to_account_info(),
                        to: ctx.accounts.treasury.to_account_info(),
                    },
                ),
                fee,
            )?;
        }

        // Transfer escrow to pool PDA
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.player.to_account_info(),
                    to: ctx.accounts.game_pool.to_account_info(),
                },
            ),
            escrow_amount,
        )?;

        // Create session
        let session = &mut ctx.accounts.session;
        session.player = ctx.accounts.player.key();
        session.escrow_amount = escrow_amount;
        session.started_at = Clock::get()?.unix_timestamp;
        session.status = SessionStatus::Active;
        session.session_id = session_id;
        session.bump = ctx.bumps.session;

        // Update pool stats
        let pool = &mut ctx.accounts.game_pool;
        pool.total_staked = pool.total_staked.checked_add(escrow_amount).unwrap();

        msg!("Player staked {} lamports (fee: {}, escrow: {})", amount, fee, escrow_amount);
        Ok(())
    }

    /// Record player death - burns their stake to the pool
    pub fn record_death(
        ctx: Context<RecordDeath>,
        death_hash: [u8; 32], // Hash of death data for verification
    ) -> Result<()> {
        let session = &ctx.accounts.session;
        require!(session.status == SessionStatus::Active, ErrorCode::SessionNotActive);

        // Update session status
        let session = &mut ctx.accounts.session;
        session.status = SessionStatus::Dead;
        session.death_hash = Some(death_hash);

        // Update pool stats
        let pool = &mut ctx.accounts.game_pool;
        pool.total_deaths = pool.total_deaths.checked_add(1).unwrap();

        // Note: The escrow SOL stays in the pool PDA (already transferred during stake)
        // This funds future victory payouts

        msg!("Death recorded. Escrow {} lamports added to pool.", session.escrow_amount);
        Ok(())
    }

    /// Claim victory - returns stake + bonus to player
    pub fn claim_victory(ctx: Context<ClaimVictory>) -> Result<()> {
        let session = &ctx.accounts.session;
        require!(session.status == SessionStatus::Active, ErrorCode::SessionNotActive);

        let pool = &ctx.accounts.game_pool;
        let escrow = session.escrow_amount;
        
        // Calculate bonus
        let bonus = escrow
            .checked_mul(pool.victory_bonus_bps as u64)
            .unwrap()
            .checked_div(10000)
            .unwrap();
        
        let total_payout = escrow.checked_add(bonus).unwrap();

        // Check pool has enough funds
        let pool_balance = ctx.accounts.game_pool.to_account_info().lamports();
        let rent_exempt = Rent::get()?.minimum_balance(GamePool::INIT_SPACE + 8);
        let available = pool_balance.saturating_sub(rent_exempt);
        
        require!(available >= total_payout, ErrorCode::InsufficientPoolFunds);

        // Transfer payout from pool to player
        let pool_info = ctx.accounts.game_pool.to_account_info();
        let player_info = ctx.accounts.player.to_account_info();
        
        **pool_info.try_borrow_mut_lamports()? -= total_payout;
        **player_info.try_borrow_mut_lamports()? += total_payout;

        // Update session
        let session = &mut ctx.accounts.session;
        session.status = SessionStatus::Victory;

        // Update pool stats
        let pool = &mut ctx.accounts.game_pool;
        pool.total_victories = pool.total_victories.checked_add(1).unwrap();
        pool.total_staked = pool.total_staked.saturating_sub(escrow);

        msg!("Victory! Paid out {} lamports (escrow: {}, bonus: {})", total_payout, escrow, bonus);
        Ok(())
    }

    /// Close a completed session to reclaim rent
    pub fn close_session(ctx: Context<CloseSession>) -> Result<()> {
        let session = &ctx.accounts.session;
        require!(
            session.status == SessionStatus::Dead || session.status == SessionStatus::Victory,
            ErrorCode::SessionStillActive
        );
        
        msg!("Session closed, rent returned to player");
        Ok(())
    }
}

// ============================================================================
// ACCOUNTS
// ============================================================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + GamePool::INIT_SPACE,
        seeds = [b"game_pool"],
        bump
    )]
    pub game_pool: Account<'info, GamePool>,
    
    /// CHECK: Treasury account to receive fees
    pub treasury: AccountInfo<'info>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(amount: u64, session_id: [u8; 32])]
pub struct Stake<'info> {
    #[account(
        mut,
        seeds = [b"game_pool"],
        bump = game_pool.bump
    )]
    pub game_pool: Account<'info, GamePool>,
    
    #[account(
        init,
        payer = player,
        space = 8 + PlayerSession::INIT_SPACE,
        seeds = [b"session", player.key().as_ref(), &session_id],
        bump
    )]
    pub session: Account<'info, PlayerSession>,
    
    /// CHECK: Treasury to receive fees
    #[account(mut, address = game_pool.treasury)]
    pub treasury: AccountInfo<'info>,
    
    #[account(mut)]
    pub player: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordDeath<'info> {
    #[account(
        mut,
        seeds = [b"game_pool"],
        bump = game_pool.bump
    )]
    pub game_pool: Account<'info, GamePool>,
    
    #[account(
        mut,
        seeds = [b"session", session.player.as_ref(), &session.session_id],
        bump = session.bump
    )]
    pub session: Account<'info, PlayerSession>,
    
    /// Authority must sign to record death (server-side validation)
    #[account(address = game_pool.authority)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimVictory<'info> {
    #[account(
        mut,
        seeds = [b"game_pool"],
        bump = game_pool.bump
    )]
    pub game_pool: Account<'info, GamePool>,
    
    #[account(
        mut,
        seeds = [b"session", session.player.as_ref(), &session.session_id],
        bump = session.bump,
        has_one = player
    )]
    pub session: Account<'info, PlayerSession>,
    
    #[account(mut)]
    pub player: Signer<'info>,
    
    /// Authority must sign to approve victory
    #[account(address = game_pool.authority)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CloseSession<'info> {
    #[account(
        mut,
        seeds = [b"session", session.player.as_ref(), &session.session_id],
        bump = session.bump,
        has_one = player,
        close = player
    )]
    pub session: Account<'info, PlayerSession>,
    
    #[account(mut)]
    pub player: Signer<'info>,
}

// ============================================================================
// STATE
// ============================================================================

#[account]
#[derive(InitSpace)]
pub struct GamePool {
    pub authority: Pubkey,        // Admin that can record deaths/victories
    pub treasury: Pubkey,         // Receives stake fees
    pub fee_bps: u16,             // Fee in basis points (500 = 5%)
    pub victory_bonus_bps: u16,   // Victory bonus in bps (5000 = 50%)
    pub total_staked: u64,        // Total SOL currently in escrow
    pub total_deaths: u64,        // Total deaths recorded
    pub total_victories: u64,     // Total victories claimed
    pub bump: u8,                 // PDA bump
}

#[account]
#[derive(InitSpace)]
pub struct PlayerSession {
    pub player: Pubkey,           // Player's wallet
    pub escrow_amount: u64,       // SOL locked in escrow
    pub started_at: i64,          // Unix timestamp
    pub status: SessionStatus,    // Active, Dead, Victory
    pub session_id: [u8; 32],     // Unique session identifier
    #[max_len(32)]
    pub death_hash: Option<[u8; 32]>, // Hash of death data
    pub bump: u8,                 // PDA bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum SessionStatus {
    Active,
    Dead,
    Victory,
}

// ============================================================================
// ERRORS
// ============================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("Fee cannot exceed 10%")]
    FeeTooHigh,
    #[msg("Bonus cannot exceed 100%")]
    BonusTooHigh,
    #[msg("Minimum stake is 0.01 SOL")]
    StakeTooLow,
    #[msg("Maximum stake is 1 SOL")]
    StakeTooHigh,
    #[msg("Session is not active")]
    SessionNotActive,
    #[msg("Session is still active")]
    SessionStillActive,
    #[msg("Insufficient funds in pool for payout")]
    InsufficientPoolFunds,
}
