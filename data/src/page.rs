#[repr(u8)]
#[derive(Debug, Clone, Copy)]
pub(crate) enum PageBits {
    HasAnyNameExceptNr2 = 1 << 0,
    HasAnyUhdef = 1 << 1,
    HasAnyNacorr = 1 << 2,
    HasAnyNacont = 1 << 3,
    HasAnyNaalte = 1 << 4,
    HasAnyNafigm = 1 << 5,
    HasAnyNaabbr = 1 << 6,
    HasAnyNau1 = 1 << 7,
}
