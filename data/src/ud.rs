use std::collections::HashMap;

use color_eyre::eyre;
use enumflags2::BitFlags;
use regex::Captures;

use crate::captures::CapturesExt;
use crate::details::{Alias, AliasType, Bits, Details};
use crate::pool::Popularity;

pub(crate) fn ud_handler(
    gc_labels: &HashMap<String, String>,
    popularity: &mut Popularity,
    sink: &mut [Details],
    captures: Captures,
) -> eyre::Result<()> {
    let point = usize::from_str_radix(captures.try_name("point")?, 16)?;
    let name = captures.try_name("name")?;
    let gc = captures.try_name("gc")?;
    let nau1 = captures.name("nau1").map(|x| Alias {
        inner: popularity.vote(x.into()),
        r#type: AliasType::Unicode1,
    });

    let bits = if gc == "Zs" {
        Bits::IsSpaceSeparator.into()
    } else if gc.starts_with("M") {
        Bits::IsAnyMark.into()
    } else {
        BitFlags::empty()
    };

    assert!(
        !name.contains("<")
            || name == "<control>"
            || name.ends_with(", First>")
            || name.ends_with(", Last>")
    );

    let name = if name.contains("<") {
        None
    } else {
        Some(popularity.vote(name))
    };
    let gc = Some(popularity.vote(gc_labels.get(gc).unwrap()));

    sink[point] = Details {
        bits,
        name,
        alias: nau1.into_iter().collect(),
        gc,
        ..Default::default()
    };

    Ok(())
}

pub(crate) fn ud_range_handler(
    ud_ranges: &mut HashMap<String, (usize, Option<usize>)>,
    captures: Captures,
) -> eyre::Result<()> {
    let point = usize::from_str_radix(captures.try_name("point")?, 16)?;
    let name = captures.try_name("name")?;
    let kind = captures.try_name("kind")?;

    match kind {
        "First" => {
            assert_eq!(ud_ranges.insert(name.to_owned(), (point, None)), None);
        }
        "Last" => {
            let pair @ &mut (first, last) = ud_ranges
                .get_mut(name)
                .expect("missing First in UnicodeData");
            assert_eq!(last, None);
            *pair = (first, Some(point));
        }
        _ => unreachable!(),
    }

    Ok(())
}

pub(crate) fn process_ud_ranges(
    ranges: HashMap<String, (usize, Option<usize>)>,
) -> HashMap<usize, usize> {
    assert_eq!(
        ranges
            .values()
            .filter(|(_first, last)| last.is_none())
            .count(),
        0
    );
    let mut result = HashMap::default();

    for &(first, last) in ranges.values() {
        for i in first..=last.expect("see assertion") {
            result.insert(i, first);
        }
    }

    result
}
