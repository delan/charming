use failure::Error;
use regex::Captures;

use crate::details::{Details, HangulSyllableType};
use crate::range::range_handler;

pub(crate) fn hst_handler(sink: &mut Vec<Details>, captures: Captures) -> Result<(), Error> {
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
