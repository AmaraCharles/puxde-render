var express = require("express");
const Settings = require("../models/Settings");
const { requireAdmin } = require("../middleware/auth");
var router = express.Router();

// The addresses that used to be hardcoded in the frontend — used to seed
// the settings document the first time this endpoint is hit, so existing
// deposits keep working even before an admin has touched this panel.
const DEFAULT_DEPOSIT_WALLETS = {
  bitcoin: { label: "Bitcoin", address: "bc1qs2j9gsactfptrtl8vuafgdzsn6yjcmmrhj8j8e" },
  ethereum: { label: "Ethereum", address: "0x931A9D422cd03869C2B321582787104ca5257AEF" },
  usdt: { label: "USDT (TRC20)", address: "TGANetvtqya2tAd3ekWWYxBqJvY6gcBzXZ" },
  usdt2: { label: "USDT (ERC20)", address: "0x931A9D422cd03869C2B321582787104ca5257AEF" },
  litecoin: { label: "LTC", address: "ltc1qu6dhgpy9ctlcvgddae90965ug8560w6u2m0ttf" },
  solana: { label: "SOL", address: "3KgeSFTRai3fHuPfgpCTBVKSDG62ZQYoBfKdykbHpSkQ" },
};

async function getOrSeedSettings() {
  let settings = await Settings.findOne({ key: "global" });
  if (!settings) {
    settings = await Settings.create({
      key: "global",
      depositWallets: DEFAULT_DEPOSIT_WALLETS,
    });
  }
  return settings;
}

// Public: the Fund Account page reads these to show a deposit address per coin.
router.get("/wallets", async function (req, res) {
  try {
    const settings = await getOrSeedSettings();
    res.status(200).json({ code: "Ok", data: settings.depositWallets });
  } catch (error) {
    console.error("Error fetching deposit wallets:", error);
    res.status(500).json({ message: "Failed to fetch deposit wallets" });
  }
});

// Admin: replace the whole set of deposit addresses.
// Body: { wallets: { bitcoin: { label, address }, ethereum: {...}, ... } }
router.put("/wallets", requireAdmin, async function (req, res) {
  const { wallets } = req.body;

  if (!wallets || typeof wallets !== "object" || Array.isArray(wallets)) {
    return res.status(400).json({ message: "wallets must be an object keyed by coin" });
  }

  for (const [coin, entry] of Object.entries(wallets)) {
    if (
      !entry ||
      typeof entry !== "object" ||
      typeof entry.address !== "string" ||
      !entry.address.trim() ||
      typeof entry.label !== "string"
    ) {
      return res.status(400).json({ message: `Invalid entry for "${coin}": expected { label, address }` });
    }
  }

  try {
    const settings = await Settings.findOneAndUpdate(
      { key: "global" },
      { $set: { depositWallets: wallets } },
      { new: true, upsert: true }
    );
    // Minimal audit trail: this touches where users' real deposits go, so
    // every change should be traceable to an admin + timestamp in the logs.
    console.log(
      `[settings.wallets] updated by ${req.admin.email} (userId=${req.admin.userId}) at ${new Date().toISOString()}:`,
      wallets
    );
    res.status(200).json({ code: "Ok", data: settings.depositWallets });
  } catch (error) {
    console.error("Error updating deposit wallets:", error);
    res.status(500).json({ message: "Failed to update deposit wallets" });
  }
});

module.exports = router;
