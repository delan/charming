// Table 4-8.  Name Derivation Rule Prefix Strings
pub(crate) const NAME_RULES: [(usize, usize, NameRule, &'static str); 16] = [
    (0xAC00, 0xD7A3, NameRule::NR1, "HANGUL SYLLABLE"),
    (0x3400, 0x4DBF, NameRule::NR2, "CJK UNIFIED IDEOGRAPH-"),
    (0x4E00, 0x9FFC, NameRule::NR2, "CJK UNIFIED IDEOGRAPH-"),
    (0x20000, 0x2A6DD, NameRule::NR2, "CJK UNIFIED IDEOGRAPH-"),
    (0x2A700, 0x2B734, NameRule::NR2, "CJK UNIFIED IDEOGRAPH-"),
    (0x2B740, 0x2B81D, NameRule::NR2, "CJK UNIFIED IDEOGRAPH-"),
    (0x2B820, 0x2CEA1, NameRule::NR2, "CJK UNIFIED IDEOGRAPH-"),
    (0x2CEB0, 0x2EBE0, NameRule::NR2, "CJK UNIFIED IDEOGRAPH-"),
    (0x30000, 0x3134A, NameRule::NR2, "CJK UNIFIED IDEOGRAPH-"),
    (0x17000, 0x187F7, NameRule::NR2, "TANGUT IDEOGRAPH-"),
    (0x18D00, 0x18D08, NameRule::NR2, "TANGUT IDEOGRAPH-"),
    (0x18B00, 0x18CD5, NameRule::NR2, "KHITAN SMALL SCRIPT CHARACTER-"),
    (0x1B170, 0x1B2FB, NameRule::NR2, "NUSHU CHARACTER-"),
    (0xF900, 0xFA6D, NameRule::NR2, "CJK COMPATIBILITY IDEOGRAPH-"),
    (0xFA70, 0xFAD9, NameRule::NR2, "CJK COMPATIBILITY IDEOGRAPH-"),
    (0x2F800, 0x2FA1D, NameRule::NR2, "CJK COMPATIBILITY IDEOGRAPH-"),
];

pub(crate) enum NameRule {
    NR1,
    NR2,
}
