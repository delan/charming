use color_eyre::eyre::Result;
use regex::Captures;

use crate::details::{Details, HangulSyllableType};
use crate::range::range_handler;

pub(crate) fn hst_handler(sink: &mut [Details], captures: Captures) -> Result<()> {
    range_handler(
        |r, x| {
            r.hst = match x {
                "LV" => Some(HangulSyllableType::Lv),
                "LVT" => Some(HangulSyllableType::Lvt),
                _ => None,
            }
        },
        sink,
        captures,
    )
}
