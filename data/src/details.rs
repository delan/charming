use std::{rc::Rc, str::FromStr};

#[derive(failure::Fail, Debug)]
#[fail(display = "unknown Name_Alias type")]
pub(crate) struct AliasTypeFromStrError;

#[derive(failure::Fail, Debug)]
#[fail(display = "unknown Grapheme_Cluster_Break value")]
pub(crate) struct GraphemeBreakFromStrError;

#[derive(Debug, Default, Clone, PartialEq)]
pub(crate) struct Details {
    pub bits: u8,
    pub ebits: u8,
    pub name: Option<Rc<str>>,
    pub alias: Vec<Alias>,
    pub dnrp: Option<Rc<str>>,
    pub gb: Option<GraphemeBreak>,
    pub gc: Option<Rc<str>>,
    pub block: Option<Rc<str>>,
    pub age: Option<Rc<str>>,
    pub hst: Option<HangulSyllableType>,
    pub hjsn: Option<Rc<str>>,
    pub hlvt: Option<(usize, usize, usize)>,
    pub uhdef: Option<Rc<str>>,
    pub uhman: Option<Rc<str>>,
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct Alias {
    pub inner: Rc<str>,
    pub r#type: AliasType,
}

#[derive(Debug, Clone, Copy, PartialEq)]
#[repr(u8)]
pub(crate) enum AliasType {
    Correction = 0,
    Control = 1,
    Alternate = 2,
    Figment = 3,
    Abbreviation = 4,
    Unicode1 = 5,
    Cldr = 6,
}

#[derive(Debug, Clone, Copy, PartialEq)]
#[repr(u8)]
pub(crate) enum GraphemeBreak {
    Cr = 1,
    Lf = 2,
    Control = 3,
    Extend = 4,
    Zwj = 5,
    RegionalIndicator = 6,
    Prepend = 7,
    SpacingMark = 8,
    HangulL = 9,
    HangulV = 10,
    HangulT = 11,
    HangulLV = 12,
    HangulLVT = 13,
}

#[repr(u8)]
#[derive(Debug, Clone, Copy)]
pub(crate) enum Bits {
    KdefinitionExists = 1 << 0,
    IsSpaceSeparator = 1 << 2,
    IsAnyMark = 1 << 3,
    DerivedNameNr1 = 1 << 4,
    DerivedNameNr2 = 1 << 5,
}

#[repr(u8)]
#[derive(Debug, Clone, Copy)]
pub(crate) enum EmojiBits {
    IsEmoji = 1 << 0,
    IsExtendedPictographic = 1 << 1,
    IsEmojiComponent = 1 << 2,
    IsEmojiPresentation = 1 << 3,
    IsEmojiModifier = 1 << 4,
    IsEmojiModifierBase = 1 << 5,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) enum HangulSyllableType {
    Lv,
    Lvt,
}

impl Details {
    pub(crate) fn r#static(
        name: impl Into<Option<&'static str>>,
        alias: &'static [(&'static str, AliasType)],
        dnrp: impl Into<Option<&'static str>>,
        gb: impl Into<Option<GraphemeBreak>>,
        gc: impl Into<Option<&'static str>>,
        block: impl Into<Option<&'static str>>,
        age: impl Into<Option<&'static str>>,
        hst: impl Into<Option<HangulSyllableType>>,
        hjsn: impl Into<Option<&'static str>>,
        hlvt: impl Into<Option<(usize, usize, usize)>>,
        uhdef: impl Into<Option<&'static str>>,
        uhman: impl Into<Option<&'static str>>,
        bits: &'static [Bits],
        emoji_bits: &'static [EmojiBits],
    ) -> Self {
        let name = name.into().map(|x| x.into());
        let alias = alias.iter().map(|(x, t)| Alias::r#static(x, *t)).collect();
        let dnrp = dnrp.into().map(|x| x.into());
        let gb = gb.into();
        let gc = gc.into().map(|x| x.into());
        let block = block.into().map(|x| x.into());
        let age = age.into().map(|x| x.into());
        let hst = hst.into();
        let hjsn = hjsn.into().map(|x| x.into());
        let hlvt = hlvt.into();
        let uhdef = uhdef.into().map(|x| x.into());
        let uhman = uhman.into().map(|x| x.into());
        let bits = bits.iter().map(|&x| x as u8).fold(0, |r,x| r | x);
        let emoji_bits = emoji_bits.iter().map(|&x| x as u8).fold(0, |r,x| r | x);

        Self { bits, ebits: emoji_bits, name, alias, dnrp, gb, gc, block, age, hst, hjsn, hlvt, uhdef, uhman }
    }
}

impl Alias {
    pub(crate) fn r#static(inner: &'static str, r#type: AliasType) -> Self {
        Alias { inner: inner.into(), r#type }
    }
}

impl FromStr for AliasType {
    type Err = AliasTypeFromStrError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(match s {
            "correction" => Self::Correction,
            "control" => Self::Control,
            "alternate" => Self::Alternate,
            "figment" => Self::Figment,
            "abbreviation" => Self::Abbreviation,
            _ => return Err(AliasTypeFromStrError),
        })
    }
}

impl FromStr for GraphemeBreak {
    type Err = GraphemeBreakFromStrError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(match s {
            "CR" => Self::Cr,
            "LF" => Self::Lf,
            "Control" => Self::Control,
            "Extend" => Self::Extend,
            "ZWJ" => Self::Zwj,
            "Regional_Indicator" => Self::RegionalIndicator,
            "Prepend" => Self::Prepend,
            "SpacingMark" => Self::SpacingMark,
            "L" => Self::HangulL,
            "V" => Self::HangulV,
            "T" => Self::HangulT,
            "LV" => Self::HangulLV,
            "LVT" => Self::HangulLVT,
            _ => return Err(GraphemeBreakFromStrError),
        })
    }
}
