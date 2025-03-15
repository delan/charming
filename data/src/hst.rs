use color_eyre::eyre;
use regex::Captures;

use crate::details::{Details, HangulSyllableType};
use crate::range::range_handler;

pub(crate) fn hst_handler(sink: &mut [Details], captures: Captures) -> eyre::Result<()> {
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
