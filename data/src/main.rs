mod age;
mod block;
mod captures;
mod details;
mod dynamic;
mod ed;
mod et;
mod gc;
mod hst;
mod jamo;
mod na;
mod page;
mod parse;
mod pool;
mod range;
mod ud;
mod ur;

use std::collections::HashMap;
use std::convert::TryInto;
use std::fs::File;
use std::io::{BufWriter, Write};
use std::rc::Rc;

use byteorder::{BigEndian, WriteBytesExt};
use failure::Error;

use crate::age::age_handler;
use crate::block::block_handler;
use crate::details::{Bits, Details, HangulSyllableType};
use crate::dynamic::{NAME_RULES, NameRule, hangul_lvt_indices};
use crate::ed::ed_handler;
use crate::et::et_handler;
use crate::gc::gc_handler;
use crate::hst::hst_handler;
use crate::jamo::jamo_handler;
use crate::na::na_handler;
use crate::page::PageBits;
use crate::parse::parse;
use crate::pool::{Pool, Popularity};
use crate::ud::{process_ud_ranges, ud_handler, ud_range_handler};
use crate::ur::ur_handler;

trait OptionRcExt {
    fn map_clone(&self) -> Self;
}

impl OptionRcExt for Option<Rc<str>> {
    fn map_clone(&self) -> Self {
        self.as_ref().map(|x| x.clone())
    }
}

fn main() -> Result<(), Error> {
    let mut gc_labels = HashMap::default();

    parse(
        &mut gc_labels,
        gc_handler,
        "PropertyValueAliases.txt", None,
        r"^gc *; *(?P<key>[^ ]+) *; *(?P<value>([^ ]+))",
    )?;

    let mut popularity = Popularity::default();
    let mut ud = points();
    let mut ud_ranges = HashMap::default();

    parse(
        &mut ud,
        |_, captures| ud_range_handler(&mut ud_ranges, captures),
        "UnicodeData.txt", "ranges",
        r"^(?P<point>[0-9A-F]+);<(?P<name>[^;]+), (?P<kind>First|Last)>",
    )?;

    parse(
        &mut ud,
        |sink, captures| ud_handler(&gc_labels, &mut popularity, sink, captures),
        "UnicodeData.txt", "all",
        r"^(?P<point>[0-9A-F]+);(?P<name>[^;]+);(?P<gc>[^;]+);(?:[^;]*;){7}(?P<nau1>[^;]+)?",
    )?;

    let ud_ranges = process_ud_ranges(ud_ranges);

    for i in 0..ud.len() {
        if let Some(&first) = ud_ranges.get(&i) {
            ud[i] = ud[first].clone();
            ud[i].name = None;
        }
    }

    parse(
        &mut ud,
        |sink, captures| block_handler(&mut popularity, sink, captures),
        "Blocks.txt", None,
        r"^(?P<first>[0-9A-F]+)[.][.](?P<last>[0-9A-F]+); (?P<value>.+)",
    )?;

    parse(
        &mut ud,
        |sink, captures| age_handler(&mut popularity, sink, captures),
        "DerivedAge.txt", None,
        r"^(?P<first>[0-9A-F]+)(?:[.][.](?P<last>[0-9A-F]+))?\s*;\s*(?P<value>[^ ]+)",
    )?;

    parse(
        &mut ud,
        |sink, captures| hst_handler(sink, captures),
        "HangulSyllableType.txt", None,
        r"^(?P<first>[0-9A-F]+)(?:[.][.](?P<last>[0-9A-F]+))?\s*;\s*(?P<value>[^ ]+)",
    )?;

    parse(
        &mut ud,
        |sink, captures| jamo_handler(&mut popularity, sink, captures),
        "Jamo.txt", None,
        r"^(?P<point>[0-9A-F]+)\s*;\s*(?P<value>[^ #]*)",
    )?;

    for i in 0..ud.len() {
        ud[i].hlvt = hangul_lvt_indices(&ud, i);
    }

    parse(
        &mut ud,
        |sink, captures| na_handler(&mut popularity, sink, captures),
        "NameAliases.txt", None,
        r"^(?P<point>[0-9A-F]+);(?P<alias>[^;]+);(?P<type>[^;]+)",
    )?;

    // Some characters have names that can be derived by algorithmic
    // rules. UnicodeData.txt often uses ranges (see above) to define
    // properties for these characters in bulk, but others are listed
    // individually due to their unique properties.
    for (first, last, rule, prefix) in NAME_RULES {
        for i in first..=last {
            // Each character with a derived name should either have
            // no explicit name (iff defined in bulk) or an explicit
            // name that matches its derived name.
            assert!(ud[i].name.as_deref().map_or(true, |x| Some(x) == derived_name(i).as_deref()));

            // Strip out all derived names from output data, to avoid
            // polluting string pool and client heap.
            ud[i].name = None;

            ud[i].dnrp = Some(popularity.vote(prefix));
            ud[i].bits |= match rule {
                NameRule::NR1 => Bits::DerivedNameNr1 as u8,
                NameRule::NR2 => Bits::DerivedNameNr2 as u8,
            };
        }
    }

    parse(
        &mut ud,
        |sink, captures| ur_handler(&mut popularity, sink, captures),
        "Unihan_Readings.txt", None,
        r"^U[+](?P<point>[0-9A-F]+)\t(?P<key>kMandarin|kDefinition)\t(?P<value>.+)",
    )?;

    parse(
        &mut ud,
        ed_handler,
        "emoji-data.txt", None,
        r"^(?P<first>[0-9A-F]+)(?:[.][.](?P<last>[0-9A-F]+))?\s*;\s*Emoji_Presentation(\s|#|$)",
    )?;

    parse(
        &mut ud,
        |sink, captures| et_handler(&mut popularity, sink, captures),
        "emoji-test.txt", None,
        r"^(?P<points>[0-9A-F]+(?: [0-9A-F]+)*)\s*;\s*fully-qualified\s*# .* E[0-9]+[.][0-9]+ (?P<name>.+)",
    )?;

    println!("Running tests ...");
    use crate::details::AliasType::*;
    assert_eq!(ud[0x0000], Details::r#static(None, &[("NULL", Unicode1), ("NULL", Control), ("NUL", Abbreviation)], None, "Control (Cc)", "Basic Latin", "Unicode 1.1", None, None, None, None, None, &[]));
    assert_eq!(ud[0x000A], Details::r#static(None, &[("LINE FEED (LF)", Unicode1), ("LINE FEED", Control), ("NEW LINE", Control), ("END OF LINE", Control), ("LF", Abbreviation), ("NL", Abbreviation), ("EOL", Abbreviation)], None, "Control (Cc)", "Basic Latin", "Unicode 1.1", None, None, None, None, None, &[]));
    assert_eq!(ud[0x0080], Details::r#static(None, &[("PADDING CHARACTER", Figment), ("PAD", Abbreviation)], None, "Control (Cc)", "Latin-1 Supplement", "Unicode 1.1", None, None, None, None, None, &[]));
    assert_eq!(ud[0x039B], Details::r#static("GREEK CAPITAL LETTER LAMDA", &[("GREEK CAPITAL LETTER LAMBDA", Unicode1)], None, "Uppercase Letter (Lu)", "Greek and Coptic", "Unicode 1.1", None, None, None, None, None, &[]));
    assert_eq!(ud[0x5170], Details::r#static(None, &[], "CJK UNIFIED IDEOGRAPH-", "Other Letter (Lo)", "CJK Unified Ideographs", "Unicode 1.1", None, None, None, "orchid; elegant, graceful", "lán", &[Bits::KdefinitionExists, Bits::DerivedNameNr2]));
    assert_eq!(ud[0x9FFF], Details::r#static(None, &[], None, "Other Letter (Lo)", "CJK Unified Ideographs", "Unicode 14.0", None, None, None, None, None, &[]));
    assert_eq!(ud[0xD4DB], Details::r#static(None, &[], "HANGUL SYLLABLE ", "Other Letter (Lo)", "Hangul Syllables", "Unicode 2.0", HangulSyllableType::Lvt, None, (17, 16, 15), None, None, &[Bits::DerivedNameNr1]));
    assert_eq!(ud[0xD788], Details::r#static(None, &[], "HANGUL SYLLABLE ", "Other Letter (Lo)", "Hangul Syllables", "Unicode 2.0", HangulSyllableType::Lv, None, (18, 20, 0), None, None, &[Bits::DerivedNameNr1]));
    assert_eq!(ud[0xF900], Details::r#static(None, &[], "CJK COMPATIBILITY IDEOGRAPH-", "Other Letter (Lo)", "CJK Compatibility Ideographs", "Unicode 1.1", None, None, None, "how? what?", None, &[Bits::KdefinitionExists, Bits::DerivedNameNr2]));
    assert_eq!(ud[0xFE18], Details::r#static("PRESENTATION FORM FOR VERTICAL RIGHT WHITE LENTICULAR BRAKCET", &[("PRESENTATION FORM FOR VERTICAL RIGHT WHITE LENTICULAR BRACKET", Correction)], None, "Close Punctuation (Pe)", "Vertical Forms", "Unicode 4.1", None, None, None, None, None, &[]));
    assert_eq!(ud[0xFEFF], Details::r#static("ZERO WIDTH NO-BREAK SPACE", &[("BYTE ORDER MARK", Unicode1), ("BYTE ORDER MARK", Alternate), ("BOM", Abbreviation), ("ZWNBSP", Abbreviation)], None, "Format (Cf)", "Arabic Presentation Forms-B", "Unicode 1.1", None, None, None, None, None, &[]));

    let report = popularity.report();

    write("data.string.json", |mut sink| {
        write!(sink, "{}", serde_json::to_string(&report)?)?;

        Ok(())
    })?;

    let pool = Pool::from(&report);

    write_pool_indices(&ud, &pool, "data.name.bin", |x| x.name.map_clone())?;
    write_pool_indices(&ud, &pool, "data.dnrp.bin", |x| x.dnrp.map_clone())?;
    write_pool_indices(&ud, &pool, "data.gc.bin", |x| x.gc.map_clone())?;
    write_pool_indices(&ud, &pool, "data.block.bin", |x| x.block.map_clone())?;
    write_pool_indices(&ud, &pool, "data.age.bin", |x| x.age.map_clone())?;
    write_pool_indices(&ud, &pool, "data.hjsn.bin", |x| x.hjsn.map_clone())?;
    write_pool_indices(&ud, &pool, "data.uhdef.bin", |x| x.uhdef.map_clone())?;
    write_pool_indices(&ud, &pool, "data.uhman.bin", |x| x.uhman.map_clone())?;
    write_sparse(&ud, "data.bits.bin", 0, u8_writer, |x| if x.bits > 0 { Some(x.bits) } else { None })?;
    write_sparse(&ud, "data.hlvt.bin", 0, u16_writer, |x| x.hlvt.map(|(l, v, t)| {
        assert!(l < (1 << 5) && v < (1 << 5) && t < (1 << 5));
        return (1 << 15 | l << 10 | v << 5 | t) as u16;
    }))?;
    write_alias_files(&ud, &pool)?;
    write("data.pagebits.bin", |mut sink| {
        for page in ud.chunks(256) {
            let mut value = 0;
            if page.iter().filter(|x| x.name.is_some() || x.bits & Bits::DerivedNameNr1 as u8 != 0).count() > 0 {
                value |= PageBits::HasAnyNameExceptNr2 as u8;
            }
            if page.iter().filter(|x| x.uhdef.is_some()).count() > 0 {
                value |= PageBits::HasAnyUhdef as u8;
            }
            if page.iter().filter(|x| !x.alias.is_empty()).count() > 0 {
                value |= PageBits::HasAnyAlias as u8;
            }
            sink.write_u8(value)?;
        }

        Ok(())
    })?;

    Ok(())
}

fn points<T: Default>() -> Vec<T> {
    let mut result = Vec::with_capacity(0x110000);
    result.resize_with(0x110000, Default::default);

    result
}

fn write<W: FnOnce(BufWriter<File>) -> Result<(), Error>>(
    path: &str,
    writer: W,
) -> Result<(), Error> {
    println!("Writing {} ...", path);

    writer(BufWriter::new(File::create(path)?))
}

fn u8_writer(sink: &mut BufWriter<File>, x: u8) -> Result<(), Error> {
    sink.write_u8(x)?;

    Ok(())
}

fn u16_writer(sink: &mut BufWriter<File>, x: u16) -> Result<(), Error> {
    sink.write_u16::<BigEndian>(x)?;

    Ok(())
}

fn write_sparse<T, U: Copy, G: FnMut(&T) -> Option<U>, W: FnMut(&mut BufWriter<File>, U) -> Result<(), Error>>(
    source: &[T],
    path: &str,
    default: U,
    mut writer: W,
    mut getter: G,
) -> Result<(), Error> {
    write(path, |mut sink| {
        let mut page_counts = Vec::default();

        for i in 0..(source.len() / 256) {
            page_counts.push(source[(i * 256)..][..256].iter()
                .filter(|x| getter(x).is_some())
                .count());
        }

        let mut page_offset = 0u16; // 0h (U+00xx) ..= 10FFh (U+10FFxx)

        for &count in &page_counts {
            if count > 0 {
                sink.write_u16::<BigEndian>(page_offset)?;
                page_offset += 1;
            } else {
                sink.write_u16::<BigEndian>(0xFFFF)?;
            }
        }

        for i in 0..(source.len() / 256) {
            if page_counts[i] > 0 {
                for j in 0..256 {
                    writer(&mut sink, getter(&source[i * 256 + j])
                        .unwrap_or(default))?;
                }
            }
        }

        Ok(())
    })
}

fn write_pool_indices<G: FnMut(&Details) -> Option<Rc<str>>>(
    source: &Vec<Details>,
    pool: &Pool,
    path: &str,
    mut getter: G,
) -> Result<(), Error> {
    write_sparse(source, path, 0xFFFF, u16_writer, |x| getter(x)
        .map(|x| pool.r#use(&x).try_into().expect("string pool overflow")))
}

fn derived_name(point: usize) -> Option<String> {
    for (first, last, rule, prefix) in NAME_RULES {
        if first <= point && point <= last {
            return Some(match rule {
                NameRule::NR1 => todo!(),
                NameRule::NR2 => format!("{}{:04X}", prefix, point),
            });
        }
    }

    None
}

fn write_alias_files(source: &[Details], pool: &Pool) -> Result<(), Error> {
    let mut counts = Vec::default();
    let mut strings = Vec::default();
    let mut types = Vec::default();

    for (i, details) in source.iter().enumerate() {
        counts.push(details.alias.len());
        for alias in &details.alias {
            strings.push(pool.r#use(&alias.inner));
            types.push(alias.r#type);
        }
    }

    write_sparse(&counts, "data.aliasc.bin", 0, u8_writer,
        |&x| Some(x.try_into().expect("alias count overflow")))?;

    write("data.aliass.bin", |mut sink| {
        for string in strings {
            u16_writer(&mut sink, string.try_into().expect("string pool overflow"))?;
        }

        Ok(())
    })?;

    write("data.aliast.bin", |mut sink| {
        for r#type in types {
            u8_writer(&mut sink, r#type as u8)?;
        }

        Ok(())
    })?;

    Ok(())
}
