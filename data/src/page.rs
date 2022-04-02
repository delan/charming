#[repr(u8)]
#[derive(Debug, Clone, Copy)]
pub(crate) enum PageBits {
    HasAnyNameExceptNr2 = 1 << 0,
    HasAnyUhdef = 1 << 1,
    HasAnyAlias = 1 << 2,
}
