#[derive(Debug, Default)]
pub(crate) struct Details {
    pub bits: u8,
    pub name: Option<String>,
    pub gc: Option<String>,
    pub mpy: Option<String>,
}

pub(crate) enum Bits {
    KdefinitionExists = 1 << 0,
    IsEmojiPresentation = 1 << 1,
    IsSpaceSeparator = 1 << 2,
    IsAnyMark = 1 << 3,
}
