use std::rc::Rc;

#[derive(Debug, Default, Clone, PartialEq)]
pub(crate) struct Details {
    pub bits: u8,
    pub name: Option<Rc<str>>,
    pub gc: Option<Rc<str>>,
    pub block: Option<Rc<str>>,
    pub age: Option<Rc<str>>,
    pub uhdef: Option<Rc<str>>,
    pub uhman: Option<Rc<str>>,
}

#[repr(u8)]
#[derive(Debug, Clone, Copy)]
pub(crate) enum Bits {
    KdefinitionExists = 1 << 0,
    IsEmojiPresentation = 1 << 1,
    IsSpaceSeparator = 1 << 2,
    IsAnyMark = 1 << 3,
}

impl Details {
    pub(crate) fn r#static(
        name: impl Into<Option<&'static str>>,
        gc: impl Into<Option<&'static str>>,
        block: impl Into<Option<&'static str>>,
        age: impl Into<Option<&'static str>>,
        uhdef: impl Into<Option<&'static str>>,
        uhman: impl Into<Option<&'static str>>,
        bits: &'static [Bits],
    ) -> Self {
        let name = name.into().map(|x| x.into());
        let gc = gc.into().map(|x| x.into());
        let block = block.into().map(|x| x.into());
        let age = age.into().map(|x| x.into());
        let uhdef = uhdef.into().map(|x| x.into());
        let uhman = uhman.into().map(|x| x.into());
        let bits = bits.iter().map(|&x| x as u8).fold(0, |r,x| r | x);

        Self { bits, name, gc, block, age, uhdef, uhman }
    }
}
