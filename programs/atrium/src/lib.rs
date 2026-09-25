use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{transfer, Mint, Token, TokenAccount, Transfer},
};

declare_id!("GH6m182Lprbfzp4TYwBmTXW3sT6c2ctoF5cyeySRuZkB");

pub const ESTATE_SEED: &[u8] = b"estate";
pub const UNIT_SEED: &[u8] = b"unit";
pub const LEVY_SEED: &[u8] = b"levy";
pub const RECEIPT_SEED: &[u8] = b"receipt";

#[program]
pub mod atrium {
    use super::*;

    pub fn create_estate(ctx: Context<CreateEstate>, name: [u8; 32]) -> Result<()> {
        let estate = &mut ctx.accounts.estate;
        estate.manager = ctx.accounts.manager.key();
        estate.mint = ctx.accounts.mint.key();
        estate.name = name;
        estate.unit_count = 0;
        estate.levy_count = 0;
        estate.bump = ctx.bumps.estate;
        Ok(())
    }

    pub fn register_unit(
        ctx: Context<RegisterUnit>,
        code: [u8; 16],
        resident: Pubkey,
    ) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.estate.manager,
            ctx.accounts.manager.key(),
            AtriumError::Unauthorized
        );

        let unit = &mut ctx.accounts.unit;
        unit.estate = ctx.accounts.estate.key();
        unit.resident = resident;
        unit.code = code;
        unit.bump = ctx.bumps.unit;

        ctx.accounts.estate.unit_count = ctx
            .accounts
            .estate
            .unit_count
            .checked_add(1)
            .ok_or(AtriumError::Overflow)?;
        Ok(())
    }

    pub fn post_levy(
        ctx: Context<PostLevy>,
        kind: u8,
        title: [u8; 32],
        amount_per_unit: u64,
        due_ts: i64,
    ) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.estate.manager,
            ctx.accounts.manager.key(),
            AtriumError::Unauthorized
        );
        require!(kind <= 1, AtriumError::InvalidKind);
        require!(amount_per_unit > 0, AtriumError::InvalidAmount);

        let index = ctx.accounts.estate.levy_count;
        let levy = &mut ctx.accounts.levy;
        levy.estate = ctx.accounts.estate.key();
        levy.kind = kind;
        levy.title = title;
        levy.amount_per_unit = amount_per_unit;
        levy.due_ts = due_ts;
        levy.paid_count = 0;
        levy.index = index;
        levy.bump = ctx.bumps.levy;

        ctx.accounts.estate.levy_count = index
            .checked_add(1)
            .ok_or(AtriumError::Overflow)?;
        Ok(())
    }

    pub fn pay_levy(ctx: Context<PayLevy>) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.unit.estate,
            ctx.accounts.estate.key(),
            AtriumError::UnitMismatch
        );
        require_keys_eq!(
            ctx.accounts.levy.estate,
            ctx.accounts.estate.key(),
            AtriumError::LevyMismatch
        );
        require!(
            ctx.accounts.payer_ata.amount >= ctx.accounts.levy.amount_per_unit,
            AtriumError::InvalidAmount
        );

        let amount = ctx.accounts.levy.amount_per_unit;
        transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.payer_ata.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            amount,
        )?;

        let receipt = &mut ctx.accounts.receipt;
        receipt.estate = ctx.accounts.estate.key();
        receipt.levy = ctx.accounts.levy.key();
        receipt.unit = ctx.accounts.unit.key();
        receipt.payer = ctx.accounts.payer.key();
        receipt.amount = amount;
        receipt.paid_at = Clock::get()?.unix_timestamp;
        receipt.bump = ctx.bumps.receipt;

        ctx.accounts.levy.paid_count = ctx
            .accounts
            .levy
            .paid_count
            .checked_add(1)
            .ok_or(AtriumError::Overflow)?;
        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct Estate {
    pub manager: Pubkey,
    pub mint: Pubkey,
    pub name: [u8; 32],
    pub unit_count: u16,
    pub levy_count: u16,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UnitAccount {
    pub estate: Pubkey,
    pub resident: Pubkey,
    pub code: [u8; 16],
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Levy {
    pub estate: Pubkey,
    pub kind: u8,
    pub title: [u8; 32],
    pub amount_per_unit: u64,
    pub due_ts: i64,
    pub paid_count: u16,
    pub index: u16,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Receipt {
    pub estate: Pubkey,
    pub levy: Pubkey,
    pub unit: Pubkey,
    pub payer: Pubkey,
    pub amount: u64,
    pub paid_at: i64,
    pub bump: u8,
}

#[derive(Accounts)]
#[instruction(name: [u8; 32])]
pub struct CreateEstate<'info> {
    #[account(mut)]
    pub manager: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = manager,
        space = 8 + Estate::INIT_SPACE,
        seeds = [ESTATE_SEED, manager.key().as_ref(), name.as_ref()],
        bump
    )]
    pub estate: Account<'info, Estate>,
    #[account(
        init,
        payer = manager,
        associated_token::mint = mint,
        associated_token::authority = estate
    )]
    pub treasury: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(code: [u8; 16])]
pub struct RegisterUnit<'info> {
    #[account(mut)]
    pub manager: Signer<'info>,
    #[account(mut)]
    pub estate: Account<'info, Estate>,
    #[account(
        init,
        payer = manager,
        space = 8 + UnitAccount::INIT_SPACE,
        seeds = [UNIT_SEED, estate.key().as_ref(), code.as_ref()],
        bump
    )]
    pub unit: Account<'info, UnitAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PostLevy<'info> {
    #[account(mut)]
    pub manager: Signer<'info>,
    #[account(mut)]
    pub estate: Account<'info, Estate>,
    #[account(
        init,
        payer = manager,
        space = 8 + Levy::INIT_SPACE,
        seeds = [LEVY_SEED, estate.key().as_ref(), &estate.levy_count.to_le_bytes()],
        bump
    )]
    pub levy: Account<'info, Levy>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PayLevy<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub estate: Account<'info, Estate>,
    pub unit: Account<'info, UnitAccount>,
    #[account(mut)]
    pub levy: Account<'info, Levy>,
    #[account(
        init,
        payer = payer,
        space = 8 + Receipt::INIT_SPACE,
        seeds = [RECEIPT_SEED, levy.key().as_ref(), unit.key().as_ref()],
        bump
    )]
    pub receipt: Account<'info, Receipt>,
    #[account(
        mut,
        constraint = payer_ata.mint == estate.mint @ AtriumError::MintMismatch,
        constraint = payer_ata.owner == payer.key() @ AtriumError::Unauthorized
    )]
    pub payer_ata: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = treasury.mint == estate.mint @ AtriumError::MintMismatch,
        constraint = treasury.owner == estate.key() @ AtriumError::TreasuryMismatch
    )]
    pub treasury: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum AtriumError {
    #[msg("Signer is not the estate manager")]
    Unauthorized,
    #[msg("Levy kind must be service (0) or diesel (1)")]
    InvalidKind,
    #[msg("Amount must be greater than zero and covered by the payer")]
    InvalidAmount,
    #[msg("This unit does not belong to the estate")]
    UnitMismatch,
    #[msg("This levy does not belong to the estate")]
    LevyMismatch,
    #[msg("Token mint does not match the estate treasury")]
    MintMismatch,
    #[msg("Treasury token account is not owned by the estate")]
    TreasuryMismatch,
    #[msg("Counter overflow")]
    Overflow,
}

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::prelude::Pubkey;

    #[test]
    fn estate_account_space_is_stable() {
        assert_eq!(Estate::INIT_SPACE, 32 + 32 + 32 + 2 + 2 + 1);
        assert_eq!(UnitAccount::INIT_SPACE, 32 + 32 + 16 + 1);
        assert_eq!(Levy::INIT_SPACE, 32 + 1 + 32 + 8 + 8 + 2 + 2 + 1);
        assert_eq!(Receipt::INIT_SPACE, 32 + 32 + 32 + 32 + 8 + 8 + 1);
    }

    #[test]
    fn estate_pda_uses_manager_and_name() {
        let manager = Pubkey::new_unique();
        let name = [7u8; 32];
        let (pda, bump) = Pubkey::find_program_address(
            &[ESTATE_SEED, manager.as_ref(), name.as_ref()],
            &crate::ID,
        );
        assert_ne!(pda, Pubkey::default());
        assert!(bump > 0);
    }

    #[test]
    fn unit_and_levy_and_receipt_pdas_are_distinct() {
        let estate = Pubkey::new_unique();
        let code = [b'B', b'-', b'0', b'1', b'8', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        let (unit, _) =
            Pubkey::find_program_address(&[UNIT_SEED, estate.as_ref(), code.as_ref()], &crate::ID);
        let (levy, _) = Pubkey::find_program_address(
            &[LEVY_SEED, estate.as_ref(), &0u16.to_le_bytes()],
            &crate::ID,
        );
        let (receipt, _) =
            Pubkey::find_program_address(&[RECEIPT_SEED, levy.as_ref(), unit.as_ref()], &crate::ID);
        assert_ne!(unit, levy);
        assert_ne!(levy, receipt);
        assert_ne!(unit, receipt);
    }
}
