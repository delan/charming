use color_eyre::eyre;
use regex::Captures;

use crate::captures::CapturesExt;
use crate::details::{Details, EmojiBits};

pub(crate) fn ed_handler(sink: &mut [Details], captures: Captures) -> eyre::Result<()> {
    let first = captures.try_name("first")?;
    let last = captures.name_or("last", first);
    let property = captures.try_name("property")?;

    let start = usize::from_str_radix(first, 16)?;
    let len = usize::from_str_radix(last, 16)? - start + 1;

    for item in sink.iter_mut().skip(start).take(len) {
        item.ebits |= match property {
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
