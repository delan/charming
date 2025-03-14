use std::{rc::Rc, str::FromStr};

use bon::Builder;
use color_eyre::eyre::{self, bail};

#[derive(Debug, Default, Clone, PartialEq, Builder)]
#[builder(on(Rc<str>, into))]
pub(crate) struct Details {
    #[builder(default)]
    pub bits: u8,
    #[builder(default)]
    pub ebits: u8,
    pub name: Option<Rc<str>>,
    #[builder(with = |alias: &'static[(&str, AliasType)]| { alias.iter().map(|(x, t)| Alias::r#static(x, *t)).collect() })]
    #[builder(default)]
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
    Emoji = 1 << 0,
    ExtendedPictographic = 1 << 1,
    EmojiComponent = 1 << 2,
    EmojiPresentation = 1 << 3,
    EmojiModifier = 1 << 4,
    EmojiModifierBase = 1 << 5,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) enum HangulSyllableType {
    Lv,
    Lvt,
}

impl Alias {
    pub(crate) fn r#static(inner: &'static str, r#type: AliasType) -> Self {
        Alias {
            inner: inner.into(),
            r#type,
        }
    }
}

impl FromStr for AliasType {
    type Err = eyre::Report;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(match s {
            "correction" => Self::Correction,
            "control" => Self::Control,
            "alternate" => Self::Alternate,
            "figment" => Self::Figment,
            "abbreviation" => Self::Abbreviation,
            _ => bail!("unknown Name_Alias type: {s}"),
        })
    }
}

impl FromStr for GraphemeBreak {
    type Err = eyre::Report;

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
            _ => bail!("unknown Grapheme_Cluster_Break value: {s}"),
        })
    }
}
