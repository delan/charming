use std::rc::Rc;

#[derive(Debug, Default, Clone, PartialEq)]
pub(crate) struct Details {
    pub bits: u8,
    pub name: Option<Rc<str>>,
    pub dnrp: Option<Rc<str>>,
    pub gc: Option<Rc<str>>,
    pub block: Option<Rc<str>>,
    pub age: Option<Rc<str>>,
    pub hst: Option<HangulSyllableType>,
    pub hjsn: Option<Rc<str>>,
    pub hlvt: Option<(usize, usize, usize)>,
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
    DerivedNameNr1 = 1 << 4,
    DerivedNameNr2 = 1 << 5,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) enum HangulSyllableType {
    Lv,
    Lvt,
}

impl Details {
    pub(crate) fn r#static(
        name: impl Into<Option<&'static str>>,
        dnrp: impl Into<Option<&'static str>>,
        gc: impl Into<Option<&'static str>>,
        block: impl Into<Option<&'static str>>,
        age: impl Into<Option<&'static str>>,
        hst: impl Into<Option<HangulSyllableType>>,
        hjsn: impl Into<Option<&'static str>>,
        hlvt: impl Into<Option<(usize, usize, usize)>>,
        uhdef: impl Into<Option<&'static str>>,
        uhman: impl Into<Option<&'static str>>,
        bits: &'static [Bits],
    ) -> Self {
        let name = name.into().map(|x| x.into());
        let dnrp = dnrp.into().map(|x| x.into());
        let gc = gc.into().map(|x| x.into());
        let block = block.into().map(|x| x.into());
        let age = age.into().map(|x| x.into());
        let hst = hst.into();
        let hjsn = hjsn.into().map(|x| x.into());
        let hlvt = hlvt.into();
        let uhdef = uhdef.into().map(|x| x.into());
        let uhman = uhman.into().map(|x| x.into());
        let bits = bits.iter().map(|&x| x as u8).fold(0, |r,x| r | x);

        Self { bits, name, dnrp, gc, block, age, hst, hjsn, hlvt, uhdef, uhman }
    }
}
