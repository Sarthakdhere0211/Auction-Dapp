#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Symbol};

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Admin,
    Allowance(AllowanceKey),
    Balance(Address),
    Metadata,
}

#[contracttype]
#[derive(Clone)]
struct AllowanceKey {
    from: Address,
    spender: Address,
}

#[contracttype]
#[derive(Clone)]
struct Metadata {
    decimal: u32,
    name: String,
    symbol: String,
}

#[contract]
pub struct TokenContract;

#[contractimpl]
impl TokenContract {
    pub fn initialize(env: Env, admin: Address, decimal: u32, name: String, symbol: String) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(
            &DataKey::Metadata,
            &Metadata {
                decimal,
                name,
                symbol,
            },
        );
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let balance = Self::balance(env.clone(), to.clone());
        env.storage().instance().set(&DataKey::Balance(to), &(balance + amount));
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();

        let from_balance = Self::balance(env.clone(), from.clone());
        let to_balance = Self::balance(env.clone(), to.clone());

        if from_balance < amount {
            panic!("insufficient balance");
        }

        env.storage().instance().set(&DataKey::Balance(from), &(from_balance - amount));
        env.storage().instance().set(&DataKey::Balance(to), &(to_balance + amount));
    }

    pub fn balance(env: Env, id: Address) -> i128 {
        env.storage().instance().get(&DataKey::Balance(id)).unwrap_or(0)
    }

    pub fn approve(env: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32) {
        from.require_auth();
        let key = DataKey::Allowance(AllowanceKey { from, spender });
        env.storage().temporary().set(&key, &amount);
        env.storage().temporary().extend_ttl(&key, expiration_ledger, expiration_ledger);
    }

    pub fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        let key = DataKey::Allowance(AllowanceKey { from, spender });
        env.storage().temporary().get(&key).unwrap_or(0)
    }

    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();

        let allowance = Self::allowance(env.clone(), from.clone(), spender.clone());
        if allowance < amount {
            panic!("insufficient allowance");
        }

        let from_balance = Self::balance(env.clone(), from.clone());
        let to_balance = Self::balance(env.clone(), to.clone());

        if from_balance < amount {
            panic!("insufficient balance");
        }

        env.storage().temporary().set(
            &DataKey::Allowance(AllowanceKey { from: from.clone(), spender }),
            &(allowance - amount),
        );
        env.storage().instance().set(&DataKey::Balance(from), &(from_balance - amount));
        env.storage().instance().set(&DataKey::Balance(to), &(to_balance + amount));
    }
}
