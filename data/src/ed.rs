use color_eyre::eyre::Result;
use regex::Captures;

use crate::captures::CapturesExt;
use crate::details::{Details, EmojiBits};

pub(crate) fn ed_handler(sink: &mut Vec<Details>, captures: Captures) -> Result<()> {
    let first = captures.try_name("first")?;
    let last = captures.name_or("last", first);
    let property = captures.try_name("property")?;

    let p = usize::from_str_radix(first, 16)?;
    let q = usize::from_str_radix(last, 16)? + 1;

    for i in p..q {
        sink[i].ebits |= match property {
            "Emoji" => EmojiBits::Emoji,
            "Extended_Pictographic" => EmojiBits::ExtendedPictographic,
            "Emoji_Component" => EmojiBits::EmojiComponent,
            "Emoji_Presentation" => EmojiBits::EmojiPresentation,
            "Emoji_Modifier" => EmojiBits::EmojiModifier,
            "Emoji_Modifier_Base" => EmojiBits::EmojiModifierBase,
            x => panic!("unexpected property: {}", x),
        };
    }

    Ok(())
}
