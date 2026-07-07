# Die Forward — Localization Kit

Target locales: **ja, ko, zh-TW, vi, pt-BR, es**

Source of truth for English: `docs/CONTENT_BIBLE.md` (voice), `mobile/lib/content.ts`
(BESTIARY / ITEM_DETAILS / SYNERGIES keys), `mobile/lib/locales/en.json` (synergy
names, flavor, rule telegraphs), `mobile/lib/zones/*.json` (zone meta, lore, prose).

The glossary below is **fixed**. Translators do not improvise alternatives for any
term listed here. If a term is missing, raise it — do not coin silently.

> Scope note: the code's canonical bestiary (`content.ts` BESTIARY, 21 keys) differs
> from the Content Bible's aspirational list. This kit covers the 21 shipped keys plus
> all zone-pack creatures. Bible-only creatures (Throat Singers, Throne Keeper, The
> Architect, First Pilgrim, etc.) get entries only when they ship.

---

## 1. Mechanical Rules (all locales, non-negotiable)

1. **Identifier fields stay English verbatim.** In zone JSON and code-adjacent data,
   the values of `id`, `template`, `type`, `behaviors`, `enemy`, `tags`, `signature`,
   `artUrl`, audio paths, color hex codes, and **all JSON keys** are machine
   identifiers. Never translate, transliterate, reorder, or re-case them.
2. **Translate JSON string *values* only, and only prose ones** — `narrative`,
   `description`, `lore`, `tagline`, display `name` fields that are player-facing
   via i18n, `options` entries, `effect`, `mechanicDescription`. When in doubt: if a
   string is compared with `===` anywhere in code (e.g. `enemy: "The Drowned"`,
   `items: ['Bone Hook', 'Bone Charm']`), it is an identifier. Display names come
   from locale files keyed by those identifiers.
3. **Placeholders pass through untouched.** `{name}`, `{PLAYER}`, `{MESSAGE}`,
   `{flavor}` and any `{...}` token stay byte-identical, including case. Reorder the
   sentence around them freely; never translate inside the braces.
4. **Bracketed tokens pass through untouched.** `[FINAL MESSAGE]` and similar
   `[ALL-CAPS]` markers are substitution slots, not text.
5. **No exclamation marks in any locale.** Ever. Includes `！`. Dread through
   understatement survives translation; exclamation does not.
6. **Preserve formatting characters** found in source strings: markdown (`*`, `_`,
   backticks), em dashes used structurally, `\n`, leading/trailing spaces, and the
   trailing colon on corpse narratives (adapt the colon to locale typography — see §4
   — but keep the "message follows" function).
7. **Glossary terms apply only inside prose.** A creature name inside a `narrative`
   string is translated per glossary; the same name as an `enemy` value is not.
8. **Length discipline.** Room narratives target the same visual weight as English
   (~50 words / ~2–3 lines on a phone). CJK output will naturally be shorter in
   characters; do not pad.

---

## 2. Voice Rules per Locale

**ja — Japanese.** Plain narrative register, だ／である (never です・ます in game
prose; UI buttons may use noun forms). Second person: avoid literal あなた — drop the
subject entirely and let verb voice carry "you" (「降りていく。空気が冷たくなる。」);
use お前 only when a creature or NPC addresses the player. Present tense, short
sentences, fragments welcome. Horror register follows Japanese weird-fiction
convention: classical flourishes are allowed in *names* (〜し者, 〜なる者, 生ける〜)
but body prose stays modern and spare. **No katakana English loans for lore words**
— coin kanji compounds instead (溺者-style); katakana is reserved for genuinely
foreign UI concepts (SOL, Solana) only. Onomatopoeia sparingly and in hiragana.

**ko — Korean.** Narrative in 해라체 평서형 (한다/이다/-ㄴ다) — the register of
literary fiction, not the polite UI register. Second person: omit the subject; use
당신 only where ambiguity forces it, and 너 only in hostile creature speech. Present
tense declaratives, clipped rhythm: 「내려간다. 공기가 차가워진다.」 Prefer native
Korean words for texture (주검, 너울, 잿빛) and Sino-Korean (한자어) coinages for
proper names (포복귀, 명부) — never English transliteration for lore terms. UI
chrome (buttons, settings) may use 합쇼체 noun forms, but all in-world prose is 해라체.

**zh-TW — Traditional Chinese (Taiwan).** Traditional characters throughout, Taiwan
lexical conventions. Literary-leaning register: written 書面語, compact clauses, no
Beijing colloquialisms, no 你們-plural padding. Second person: 你 is acceptable and
standard in Chinese second-person narration, but drop it wherever the clause reads
cleanly without (「往下走。空氣漸冷。」). Four-character rhythm is welcome in names
and taglines, not forced in body prose. Coin names from classical roots (溺亡者,
冥府) — no transliteration, no English left in prose.

**vi — Vietnamese.** Address the player as **ngươi** — the archaic/literary second
person of võ hiệp and dark-fantasy translation convention; it keeps distance and
dread (bạn is too friendly, mày too vulgar). Creatures and the underworld may call
the player *kẻ phàm* or *ngươi*. Present tense, short declaratives. Prefer
Sino-Vietnamese compounds for proper names and ritual vocabulary (âm phủ, thi hài,
hồn thạch) and native Vietnamese for sensation (ẩm ướt, lạnh buốt). Capitalize each
word of proper names (Hầm Mộ Chìm) per game-title convention.

**pt-BR — Brazilian Portuguese.** Address the player as **você** with null-subject
style — conjugate for você but omit the pronoun almost always ("Desce. O ar
esfria."). Never tu, never o senhor. Present tense (presente do indicativo) for
narration, imperative for options ("Siga em frente"). Register: literary but
contemporary — the tone of translated Cormac McCarthy, not colonial pastiche. Avoid
Anglicisms and gamer slang in prose; keep them out of names entirely.

**es — Spanish (LatAm-neutral).** Address the player as **tú** — informal-intimate,
standard for the genre — with null subject ("Desciendes. El aire se enfría.").
No vos, no usted, no vosotros; ustedes for any plural. Present tense narration,
tuteo imperative for options ("Sigue adelante"). Neutral Latin American vocabulary
(no coger, no distinctly Peninsular or Rioplatense terms). Literary register: sober,
sensory, understated — dread carried by rhythm, not adjectives.

---

## 3. Glossary Tables

Fixed translations. Names below are the **display strings**; the English string
remains the identifier in data files.

### 3.1 Zones

| EN | ja | ko | zh-TW | vi | pt-BR | es |
|---|---|---|---|---|---|---|
| The Sunken Crypt | 沈みし墓所 | 가라앉은 묘실 | 沉沒墓窟 | Hầm Mộ Chìm | A Cripta Submersa | La Cripta Sumergida |
| The Ashen Crypts | 灰燼の墓所 | 잿빛 묘실 | 灰燼墓窟 | Hầm Mộ Tro Tàn | As Criptas Cinéreas | Las Criptas Cenicientas |
| The Frozen Gallery | 凍てつく回廊 | 얼어붙은 회랑 | 冰封迴廊 | Hành Lang Băng Giá | A Galeria Congelada | La Galería Helada |
| The Living Tomb | 生ける墳墓 | 살아 있는 무덤 | 活墓 | Ngôi Mộ Sống | O Túmulo Vivo | La Tumba Viviente |
| The Void Beyond | 彼方の虚無 | 저편의 공허 | 彼方虛空 | Hư Không Bên Kia | O Vazio Além | El Vacío Más Allá |

Taglines (fixed renderings):

| Zone | ja | ko | zh-TW | vi | pt-BR | es |
|---|---|---|---|---|---|---|
| Sunken: "The first descent. Nothing here is alive." | 最初の降下。ここに生きているものは何もない。 | 첫 번째 하강. 이곳에 살아 있는 것은 없다. | 第一次下行。此地沒有活物。 | Cuộc xuống sâu đầu tiên. Nơi đây không gì còn sống. | A primeira descida. Nada aqui está vivo. | El primer descenso. Nada aquí está vivo. |
| Ashen: "A civilization that chose fire over surrender." | 降伏よりも火を選んだ文明。 | 항복 대신 불을 택한 문명. | 寧選烈火、不肯屈服的文明。 | Một nền văn minh chọn lửa thay vì đầu hàng. | Uma civilização que escolheu o fogo em vez da rendição. | Una civilización que eligió el fuego antes que la rendición. |
| Frozen: "Time stopped here. The dead are preserved perfectly." | ここで時は止まった。死者は完全なまま保たれている。 | 이곳에서 시간이 멈췄다. 죽은 자들은 완벽하게 보존되어 있다. | 時間在此停止。死者被完好保存。 | Thời gian dừng lại ở đây. Người chết được lưu giữ nguyên vẹn. | O tempo parou aqui. Os mortos estão perfeitamente preservados. | El tiempo se detuvo aquí. Los muertos se conservan perfectamente. |
| Living Tomb: "Something grew in the dark. Now everything is part of it." | 闇の中で何かが育った。今やすべてがその一部だ。 | 어둠 속에서 무언가가 자라났다. 이제 모든 것이 그 일부다. | 有什麼在黑暗中生長。如今萬物皆是它的一部分。 | Có thứ gì đó đã mọc lên trong bóng tối. Giờ mọi thứ đều là một phần của nó. | Algo cresceu no escuro. Agora tudo faz parte dele. | Algo creció en la oscuridad. Ahora todo forma parte de ello. |
| Void: "Where the underworld forgot to finish building." | 冥府が造りかけのまま忘れた場所。 | 명부가 짓다 만 채 잊어버린 곳. | 冥府忘了建完的地方。 | Nơi âm phủ quên xây cho xong. | Onde o submundo esqueceu de terminar de construir. | Donde el inframundo olvidó terminar de construir. |

### 3.2 Bestiary — core 21 (exact `content.ts` BESTIARY keys)

| EN (identifier) | ja | ko | zh-TW | vi | pt-BR | es |
|---|---|---|---|---|---|---|
| The Drowned | 溺者 | 익사자 | 溺亡者 | Kẻ Chết Đuối | Os Afogados | Los Ahogados |
| Pale Crawler | 蒼白の這うもの | 창백한 포복귀 | 蒼白爬行者 | Kẻ Trườn Nhợt Nhạt | Rastejante Pálido | Reptante Pálido |
| The Hollow | 虚ろなる者 | 텅 빈 자 | 空洞者 | Kẻ Rỗng | O Oco | El Hueco |
| Bloated One | 膨れしもの | 부풀어 오른 자 | 臃腫者 | Kẻ Trương Phình | O Intumescido | El Hinchado |
| Flickering Shade | 明滅する影 | 명멸하는 그림자 | 明滅之影 | Bóng Chập Chờn | Sombra Trêmula | Sombra Titilante |
| The Hunched | 屈みし者 | 웅크린 자 | 佝僂者 | Kẻ Khom Lưng | O Encurvado | El Encorvado |
| Tideborn | 潮生まれ | 조수 태생 | 潮生者 | Triều Sinh | Nascido da Maré | Nacido de la Marea |
| Bone Weavers | 骨織り | 뼈 엮는 자 | 織骨者 | Kẻ Dệt Xương | Tecelões de Ossos | Tejedores de Huesos |
| Ash Children | 灰の子ら | 재의 아이들 | 灰燼之子 | Những Đứa Trẻ Tro | Crianças de Cinza | Niños de Ceniza |
| Echo Husks | 残響の抜け殻 | 메아리 껍데기 | 回聲空殼 | Xác Vọng Âm | Cascas de Eco | Cáscaras de Eco |
| Hollow Clergy | 虚ろの祭司 | 텅 빈 사제단 | 空洞祭司 | Giáo Sĩ Rỗng | Clero Oco | Clero Hueco |
| The Bound | 縛られし者 | 결박된 자 | 受縛者 | Kẻ Bị Trói | O Agrilhoado | El Encadenado |
| Forgotten Guardian | 忘れられし守護者 | 잊힌 수호자 | 遺忘守衛 | Hộ Vệ Bị Lãng Quên | Guardião Esquecido | Guardián Olvidado |
| The Weeping | 咽び泣くもの | 흐느끼는 자 | 慟哭者 | Kẻ Than Khóc | As Carpideiras | Las Plañideras |
| Carrion Knight | 腐肉の騎士 | 부육의 기사 | 腐肉騎士 | Hiệp Sĩ Xác Thối | Cavaleiro Carniçal | Caballero Carroñero |
| Pale Oracle | 蒼白の神託者 | 창백한 신탁자 | 蒼白神諭者 | Tiên Tri Nhợt Nhạt | Oráculo Pálido | Oráculo Pálido |
| The Congregation | 会衆 | 회중 | 會眾 | Hội Chúng | A Congregação | La Congregación |
| Pale Crawler Swarm | 蒼白の這うものの群れ | 창백한 포복귀 떼 | 蒼白爬行者群 | Bầy Trườn Nhợt Nhạt | Enxame de Rastejantes Pálidos | Enjambre de Reptantes Pálidos |
| The Unnamed | 名も無き者 | 이름 없는 자 | 無名者 | Kẻ Vô Danh | O Inominado | El Innombrado |
| Mother of Tides | 潮の母 | 조수의 어머니 | 潮汐之母 | Mẹ Thủy Triều | Mãe das Marés | Madre de las Mareas |
| The Keeper | 番人 | 파수꾼 | 看守者 | Kẻ Canh Giữ | O Custódio | El Custodio |

### 3.3 Bestiary — zone-pack creatures (from `mobile/lib/zones/*.json`)

| EN (identifier) | ja | ko | zh-TW | vi | pt-BR | es |
|---|---|---|---|---|---|---|
| Ember Husks | 燠火の抜け殻 | 잉걸불 껍데기 | 餘燼空殼 | Vỏ Than Hồng | Cascas de Brasa | Cáscaras de Ascua |
| Cinder Priests | 余燼の祭司 | 잿불 사제 | 燼火祭司 | Tư Tế Tro Than | Sacerdotes da Cinza | Sacerdotes del Rescoldo |
| The Scorched | 焼かれし者 | 그을린 자 | 焦灼者 | Kẻ Cháy Sém | Os Crestados | Los Calcinados |
| Flame Weavers | 炎織り | 불꽃 엮는 자 | 織焰者 | Kẻ Dệt Lửa | Tecelões de Chamas | Tejedores de Llamas |
| Ashen Congregation | 灰の会衆 | 잿빛 회중 | 灰燼會眾 | Hội Chúng Tro Tàn | Congregação Cinérea | Congregación de Ceniza |
| The Scorched Veteran | 焼かれし古兵 | 그을린 노병 | 焦灼老兵 | Lão Binh Cháy Sém | Veterano Crestado | Veterano Calcinado |
| Senior Flame Weaver | 炎織りの長 | 불꽃 엮는 장로 | 織焰者長老 | Trưởng Lão Dệt Lửa | Tecelão de Chamas Ancião | Tejedor de Llamas Mayor |
| The Pyre Keeper | 火葬壇の番人 | 화장단의 파수꾼 | 焚堆看守者 | Kẻ Canh Giàn Thiêu | Custódio da Pira | Custodio de la Pira |
| The Preserved | 保たれし者 | 보존된 자 | 封存者 | Kẻ Bị Lưu Giữ | Os Preservados | Los Preservados |
| Ice Wraiths | 氷の亡霊 | 얼음 망령 | 寒冰怨靈 | Oán Hồn Băng | Espectros de Gelo | Espectros de Hielo |
| Frost Sentinels | 霜の哨兵 | 서리 파수병 | 霜之哨衛 | Lính Gác Sương Giá | Sentinelas de Geada | Centinelas de Escarcha |
| The Shattered | 砕かれし者 | 부서진 자 | 碎裂者 | Kẻ Vỡ Vụn | Os Estilhaçados | Los Quebrantados |
| The Glacial Sovereign | 氷河の君主 | 빙하의 군주 | 冰河君主 | Chúa Tể Băng Hà | O Soberano Glacial | El Soberano Glacial |
| Mycelium Crawlers | 菌糸の這うもの | 균사 포복귀 | 菌絲爬行者 | Kẻ Trườn Tơ Nấm | Rastejantes de Micélio | Reptantes de Micelio |
| The Incorporated | 取り込まれし者 | 동화된 자 | 同化者 | Kẻ Bị Đồng Hóa | Os Incorporados | Los Incorporados |
| Membrane Guardian | 膜の守護者 | 피막의 수호자 | 薄膜守衛 | Hộ Vệ Màng Nhầy | Guardião da Membrana | Guardián de la Membrana |
| The Bloom | 開花せしもの | 만개한 것 | 綻放者 | Đóa Nở Rộ | A Florescência | La Floración |
| The Root | 根なるもの | 뿌리 | 根源 | Cội Rễ | A Raiz | La Raíz |
| Probability Shade | 確率の影 | 확률의 그림자 | 機率之影 | Bóng Xác Suất | Sombra de Probabilidade | Sombra de Probabilidad |
| Echo Double | 残響の写し身 | 메아리 분신 | 回聲分身 | Bản Sao Vọng Âm | Duplo de Eco | Doble de Eco |
| Void Architect | 虚無の設計者 | 공허의 설계자 | 虛空構築者 | Kiến Trúc Sư Hư Không | Arquiteto do Vazio | Arquitecto del Vacío |
| The Unanchored | 繋がれざる者 | 닻 잃은 자 | 失錨者 | Kẻ Mất Neo | O Desancorado | El Desanclado |
| The Unwritten | 記されざる者 | 쓰이지 않은 자 | 未書之者 | Kẻ Chưa Được Viết | O Não Escrito | El No Escrito |

### 3.4 Items — all 26 `ITEM_DETAILS` keys

| EN (identifier) | ja | ko | zh-TW | vi | pt-BR | es |
|---|---|---|---|---|---|---|
| Herbs | 薬草 | 약초 | 藥草 | Thảo Dược | Ervas | Hierbas |
| Pale Rations | 蒼白の糧 | 창백한 식량 | 蒼白口糧 | Khẩu Phần Nhợt Nhạt | Rações Pálidas | Raciones Pálidas |
| Bone Dust | 骨の塵 | 뼛가루 | 骨塵 | Bột Xương | Pó de Ossos | Polvo de Hueso |
| Void Salt | 虚無の塩 | 공허의 소금 | 虛空之鹽 | Muối Hư Không | Sal do Vazio | Sal del Vacío |
| Poison Vial | 毒の小瓶 | 독약 병 | 毒液瓶 | Lọ Độc | Frasco de Veneno | Vial de Veneno |
| Rusty Blade | 錆びた刃 | 녹슨 칼날 | 鏽蝕之刃 | Lưỡi Dao Gỉ Sét | Lâmina Enferrujada | Hoja Oxidada |
| Dagger | 短剣 | 단검 | 匕首 | Dao Găm | Adaga | Daga |
| Bone Hook | 骨の鉤 | 뼈 갈고리 | 骨鉤 | Móc Xương | Gancho de Osso | Gancho de Hueso |
| Shield | 盾 | 방패 | 盾牌 | Khiên | Escudo | Escudo |
| Tattered Shield | 綻びた盾 | 해진 방패 | 殘破之盾 | Khiên Rách Nát | Escudo Esfarrapado | Escudo Andrajoso |
| Cloak | 外套 | 망토 | 斗篷 | Áo Choàng | Capa | Capa |
| Torch | 松明 | 횃불 | 火炬 | Đuốc | Tocha | Antorcha |
| Bone Charm | 骨の護符 | 뼈 부적 | 骨符 | Bùa Xương | Amuleto de Osso | Amuleto de Hueso |
| Ancient Scroll | 古の巻物 | 고대 두루마리 | 古老卷軸 | Cuộn Thư Cổ | Pergaminho Antigo | Pergamino Antiguo |
| Eye of the Hollow | 虚ろの眼 | 텅 빈 자의 눈 | 空洞者之眼 | Mắt của Kẻ Rỗng | Olho do Oco | Ojo del Hueco |
| Heartstone | 心臓石 | 심장석 | 心石 | Tâm Thạch | Pedra-Coração | Piedra-Corazón |
| Pale Coin | 蒼白の硬貨 | 창백한 동전 | 蒼白錢幣 | Đồng Xu Nhợt Nhạt | Moeda Pálida | Moneda Pálida |
| Soulstone | 魂石 | 영혼석 | 魂石 | Hồn Thạch | Pedra da Alma | Piedra del Alma |
| Voidblade | 虚無の刃 | 공허의 검 | 虛空之刃 | Kiếm Hư Không | Lâmina do Vazio | Hoja del Vacío |
| Ember Flask | 燠火の瓶 | 잉걸불 병 | 餘燼之瓶 | Bình Than Hồng | Frasco de Brasas | Frasco de Ascuas |
| Ash Veil | 灰の薄衣 | 재의 너울 | 灰紗 | Màn Tro | Véu de Cinzas | Velo de Ceniza |
| Frost Shard | 霜の欠片 | 서리 조각 | 霜之碎片 | Mảnh Sương Giá | Fragmento de Geada | Esquirla de Escarcha |
| Thermal Flask | 温熱の瓶 | 온기의 병 | 溫熱之瓶 | Bình Ấm | Frasco de Calor | Frasco de Calor |
| Clarity Shard | 明澄の欠片 | 명징의 조각 | 澄明碎片 | Mảnh Minh Tâm | Fragmento de Clareza | Esquirla de Claridad |
| Cleansing Salts | 浄めの塩 | 정화의 소금 | 淨鹽 | Muối Thanh Tẩy | Sais Purificadores | Sales Purificadoras |
| Death's Mantle | 死の外衣 | 죽음의 수의 | 死之殮衣 | Áo Liệm Tử Thần | Manto da Morte | Manto de la Muerte |

### 3.5 Synergies — all 8 (`en.json` `synergy.*` keys are canonical)

| EN | ja | ko | zh-TW | vi | pt-BR | es |
|---|---|---|---|---|---|---|
| Ossuary Pact | 納骨堂の契り | 납골당의 맹약 | 藏骨堂之約 | Khế Ước Hài Cốt | Pacto do Ossuário | Pacto del Osario |
| Grave Tide | 墓潮 | 무덤의 조수 | 墓潮 | Triều Mộ Phần | Maré Tumular | Marea Sepulcral |
| Last Breath Pact | 終の息の契り | 마지막 숨의 맹약 | 末息之約 | Khế Ước Hơi Thở Cuối | Pacto do Último Suspiro | Pacto del Último Aliento |
| Hungering Edge | 飢えたる刃 | 굶주린 칼날 | 餓刃 | Lưỡi Dao Đói Khát | Gume Faminto | Filo Hambriento |
| Ashen Ward | 灰の守り | 재의 결계 | 灰燼結界 | Hộ Phù Tro Tàn | Resguardo Cinéreo | Resguardo Ceniciento |
| Pilgrim's Clarity | 巡礼者の明澄 | 순례자의 명징 | 朝聖者的澄明 | Minh Tâm Người Hành Hương | Clareza do Peregrino | Claridad del Peregrino |
| Twin Fangs | 双牙 | 쌍아 | 雙牙 | Nanh Đôi | Presas Gêmeas | Colmillos Gemelos |
| Beggar's Grace | 物乞いの恩寵 | 걸인의 은총 | 乞者恩典 | Ân Sủng Kẻ Hành Khất | Graça do Mendigo | Gracia del Mendigo |

Synergy flavor lines follow the same voice rules as room prose; the paired-noun
rhythm ("Salt and frost. The water remembers…") must survive: two beats, full stop
between them.

### 3.6 Core recurring terms

| EN | ja | ko | zh-TW | vi | pt-BR | es |
|---|---|---|---|---|---|---|
| the depths | 深み | 심연 | 深淵 | vực sâu | as profundezas | las profundidades |
| the underworld | 冥府 | 명부 | 冥府 | âm phủ | o submundo | el inframundo |
| descend (v.) | 降りる | 내려가다 | 下行 | xuống sâu | descer | descender |
| descent (n., a run) | 降下 | 하강 | 下行 | cuộc xuống sâu | a descida | el descenso |
| offering | 供物 | 제물 | 供品 | lễ vật | oferenda | ofrenda |
| stake (n., the SOL wagered) | 賭け金 | 판돈 | 賭注 | tiền cược | aposta | apuesta |
| binding (the staking ritual) | 縛り | 속박 | 束縛 | sự ràng buộc | vínculo | el vínculo |
| corpse | 骸 | 주검 | 屍骸 | thi hài | corpo | cuerpo |
| final words | 末期の言葉 | 유언 | 遺言 | lời trăng trối | últimas palavras | últimas palabras |
| echo(es) | 残響 | 메아리 | 回聲 | vọng âm | eco(s) | eco(s) |
| wanderer | 流離う者 | 방랑자 | 漂泊者 | kẻ lang thang | andarilho | el errante |
| escape (v.) | 脱出する | 탈출하다 | 逃離 | trốn thoát | escapar | escapar |
| ascend (v.) | 昇る | 오르다 | 上行 | đi lên | subir | ascender |
| the Toll | 冥税 | 통행료 | 冥稅 | Mãi Lộ | o Tributo | el Tributo |
| stamina | 気力 | 기력 | 氣力 | thể lực | vigor | vigor |
| Pale Coins | 蒼白の硬貨 | 창백한 동전 | 蒼白錢幣 | Đồng Xu Nhợt Nhạt | Moedas Pálidas | Monedas Pálidas |

Consistency anchors (enforced across every table above): pale = 蒼白 / 창백한 /
蒼白 / nhợt nhạt / pálido / pálido · hollow = 虚ろ / 텅 빈 / 空洞 / rỗng / oco /
hueco · void = 虚無 / 공허 / 虛空 / hư không / vazio / vacío · bone = 骨 / 뼈 / 骨 /
xương / osso / hueso · keeper = 番人 / 파수꾼 / 看守者 / kẻ canh giữ / custódio /
custodio · guardian = 守護者 / 수호자 / 守衛 / hộ vệ / guardião / guardián · weaver
= 織り / 엮는 자 / 織〜者 / kẻ dệt / tecelão / tejedor · husk = 抜け殻・껍데기・空殼
/ vỏ–xác / casca / cáscara.

Rule-telegraph lines (`rule.*.telegraph` in `en.json`) are prose: translate them in
full voice, keeping the two-beat cadence and second person where present. The
signature ids (`rupture`, `reform`, `multiply`, `blink`, `pounce`, `absorb`,
`honor`, `dormant`, `drain`, `chant`) are identifiers and never appear translated.

---

## 4. Per-Locale Typography

| Rule | ja | ko | zh-TW | vi | pt-BR | es |
|---|---|---|---|---|---|---|
| Quotes (speech) | 「…」, nested 『…』 | "…" (curly) | 「…」, nested 『…』 | "…" (curly) | "…" (curly); travessão (—) allowed for dialogue | "…" or —dialogue dash |
| Ellipsis | … (U+2026), one only; 」の前も可 | … single | …… (doubled, six dots) | … single | … single | … single |
| Full stop | 。(ideographic) | . (Western) with space after | 。(ideographic) | . | . | . |
| Space before punctuation | never; no spaces between CJK and punctuation | never | never; full-width punctuation, no surrounding spaces | never (no French-style space before ? :) | never | never; no inverted ¡ (exclamations banned); ¿ required for questions |
| Latin/digits in CJK text | half-width, no added spaces around SOL/numbers | half-width, single space around Latin words | half-width; thin spacing optional, be consistent: none | n/a | n/a | n/a |
| Em dash usage | ―(horizontal bar) or 「——」sparingly; prefer 句点 | prefer sentence break over dash | ——(double em) sparingly | prefer sentence break; single — acceptable | — without surrounding spaces mid-sentence per ABNT habit is spaced: use "palavra — palavra" | raya — spaced as in EN source |
| Corpse-narrative trailing colon | ：(full-width) | : (attached, no preceding space) | ：(full-width) | : | : | : |
| Line-break sensitivity | no leading 。、」at line start (kinsoku — trust the renderer, don't hand-break) | avoid orphan particles; don't hand-break | standard kinsoku; don't hand-break | don't hand-break | don't hand-break | don't hand-break |

All locales: no exclamation marks (§1.5). Question marks are allowed where the
English uses them. Preserve the English source's paragraph and line structure.

---

## 5. Noted Tradeoffs (puns / double meanings resolved)

- **The Drowned / Tideborn / Mother of Tides** — the water-family reads as a set in
  EN; kept lexically related in every locale (潮 / 조수 / 潮 / triều / maré / marea).
- **The Hollow vs. the Void** — EN keeps these distinct; so does every locale
  (虚ろ≠虚無, 텅 빈≠공허, 空洞≠虛空, rỗng≠hư không, oco≠vazio, hueco≠vacío). Do not
  collapse them.
- **The Frozen Gallery** — "gallery" puns on art-gallery-of-preserved-dead vs.
  corridor. ja 回廊 / ko 회랑 / zh-TW 迴廊 choose the architectural sense; the
  museum nuance is carried by zone prose instead (陳列/전시/陳列 imagery allowed in
  body text). vi/pt/es keep the art sense (Hành Lang loses it slightly; Galeria/
  Galería keep it fully).
- **The Weeping → As Carpideiras / Las Plañideras** — shifts "grief given form" to
  "hired mourners", trading literalness for a native funerary-dread word; es also
  faintly echoes La Llorona. Accepted deliberately.
- **El Innombrado (The Unnamed, es)** — carries both "never named" and "not to be
  named"; the double meaning is a gain, kept.
- **The Keeper vs. Guardian** — EN distinction preserved via Custódio/Custodio,
  番人/守護者, 파수꾼/수호자, 看守者/守衛. Never swap.
- **The Toll** — no locale has a non-modern "toll". ja/zh coin 冥税/冥稅 ("underworld
  tax"); vi uses mãi lộ (bandit's road-toll, strongly evocative); pt/es shift to
  Tributo (tribute) because pedágio/peaje read as highway signage. Meaning drift
  accepted in pt/es: it is a levy the underworld exacts.
- **Death's Mantle** — ko 수의 and zh-TW 殮衣 and vi áo liệm translate as *burial
  shroud*, not "mantle": stronger fit for its heal-on-death effect. ja/pt/es stay
  literal.
- **Congregación de Ceniza (es)** — "Congregación Cenicienta" was rejected: Cenicienta
  is Cinderella in es. The zone name "Las Criptas Cenicientas" (plural, adjective
  postposed) does not trigger the association; the singular feminine does.
- **Twin Fangs → 双牙/쌍아/雙牙** — compact Sino coinage over descriptive phrase;
  reads as a technique name, which is the intent.
- **Probability Shade / Void Architect** — deliberately modern-flavored EN in the
  void zone (reality unfinished); translations keep the anachronism (確率, 확률,
  機率, xác suất) instead of archaizing it.
- **stamina → 気力/기력/氣力** — avoids the katakana/loan スタミナ per the
  no-loanword rule; if UI space forces an abbreviation, abbreviate the native term,
  never romanize.
