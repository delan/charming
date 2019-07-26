use std::rc::Rc;

#[derive(Debug, Default)]
pub(crate) struct Details {
    pub bits: u8,
    pub name: Option<Rc<str>>,
    pub gc: Option<Rc<str>>,
    pub block: Option<Rc<str>>,
    pub age: Option<Rc<str>>,
    pub mpy: Option<Rc<str>>,
}

pub(crate) enum Bits {
    KdefinitionExists = 1 << 0,
    IsEmojiPresentation = 1 << 1,
    IsSpaceSeparator = 1 << 2,
    IsAnyMark = 1 << 3,
}
