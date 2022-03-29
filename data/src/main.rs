mod age;
mod block;
mod captures;
mod details;
mod dynamic;
mod ed;
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

    println!("Running tests ...");
    assert_eq!(ud[0x0000], Details::r#static(None, None, "NULL", None, None, "NUL", "NULL", None, "Control (Cc)", "Basic Latin", "Unicode 1.1", None, None, None, None, None, &[]));
    assert_eq!(ud[0x0080], Details::r#static(None, None, None, None, "PADDING CHARACTER", "PAD", None, None, "Control (Cc)", "Latin-1 Supplement", "Unicode 1.1", None, None, None, None, None, &[]));
    assert_eq!(ud[0x039B], Details::r#static("GREEK CAPITAL LETTER LAMDA", None, None, None, None, None, "GREEK CAPITAL LETTER LAMBDA", None, "Uppercase Letter (Lu)", "Greek and Coptic", "Unicode 1.1", None, None, None, None, None, &[]));
    assert_eq!(ud[0x5170], Details::r#static(None, None, None, None, None, None, None, "CJK UNIFIED IDEOGRAPH-", "Other Letter (Lo)", "CJK Unified Ideographs", "Unicode 1.1", None, None, None, "orchid; elegant, graceful", "lán", &[Bits::KdefinitionExists, Bits::DerivedNameNr2]));
    assert_eq!(ud[0x9FFF], Details::r#static(None, None, None, None, None, None, None, None, "Other Letter (Lo)", "CJK Unified Ideographs", "Unicode 14.0", None, None, None, None, None, &[]));
    assert_eq!(ud[0xD4DB], Details::r#static(None, None, None, None, None, None, None, "HANGUL SYLLABLE ", "Other Letter (Lo)", "Hangul Syllables", "Unicode 2.0", HangulSyllableType::Lvt, None, (17, 16, 15), None, None, &[Bits::DerivedNameNr1]));
    assert_eq!(ud[0xD788], Details::r#static(None, None, None, None, None, None, None, "HANGUL SYLLABLE ", "Other Letter (Lo)", "Hangul Syllables", "Unicode 2.0", HangulSyllableType::Lv, None, (18, 20, 0), None, None, &[Bits::DerivedNameNr1]));
    assert_eq!(ud[0xF900], Details::r#static(None, None, None, None, None, None, None, "CJK COMPATIBILITY IDEOGRAPH-", "Other Letter (Lo)", "CJK Compatibility Ideographs", "Unicode 1.1", None, None, None, "how? what?", None, &[Bits::KdefinitionExists, Bits::DerivedNameNr2]));
    assert_eq!(ud[0xFE18], Details::r#static("PRESENTATION FORM FOR VERTICAL RIGHT WHITE LENTICULAR BRAKCET", "PRESENTATION FORM FOR VERTICAL RIGHT WHITE LENTICULAR BRACKET", None, None, None, None, None, None, "Close Punctuation (Pe)", "Vertical Forms", "Unicode 4.1", None, None, None, None, None, &[]));
    assert_eq!(ud[0xFEFF], Details::r#static("ZERO WIDTH NO-BREAK SPACE", None, None, "BYTE ORDER MARK", None, "ZWNBSP", "BYTE ORDER MARK", None, "Format (Cf)", "Arabic Presentation Forms-B", "Unicode 1.1", None, None, None, None, None, &[]));

    let report = popularity.report();

    write("data.string.json", |mut sink| {
        write!(sink, "{}", serde_json::to_string(&report)?)?;

        Ok(())
    })?;

    let mut pool = Pool::from(&report);

    dbg!(ud.iter().filter(|x| x.nacorr.is_some() || x.nacont.is_some() || x.naalte.is_some() || x.nafigm.is_some() || x.naabbr.is_some() || x.nau1.is_some()).count());

    write_pool_indices(&ud, &mut pool, "data.name.bin", |x| x.name.map_clone())?;
    write_pool_indices(&ud, &mut pool, "data.nacorr.bin", |x| x.nacorr.map_clone())?;
    write_pool_indices(&ud, &mut pool, "data.nacont.bin", |x| x.nacont.map_clone())?;
    write_pool_indices(&ud, &mut pool, "data.naalte.bin", |x| x.naalte.map_clone())?;
    write_pool_indices(&ud, &mut pool, "data.nafigm.bin", |x| x.nafigm.map_clone())?;
    write_pool_indices(&ud, &mut pool, "data.naabbr.bin", |x| x.naabbr.map_clone())?;
    write_pool_indices(&ud, &mut pool, "data.nau1.bin", |x| x.nau1.map_clone())?;
    write_pool_indices(&ud, &mut pool, "data.dnrp.bin", |x| x.dnrp.map_clone())?;
    write_pool_indices(&ud, &mut pool, "data.gc.bin", |x| x.gc.map_clone())?;
    write_pool_indices(&ud, &mut pool, "data.block.bin", |x| x.block.map_clone())?;
    write_pool_indices(&ud, &mut pool, "data.age.bin", |x| x.age.map_clone())?;
    write_pool_indices(&ud, &mut pool, "data.hjsn.bin", |x| x.hjsn.map_clone())?;
    write_pool_indices(&ud, &mut pool, "data.uhdef.bin", |x| x.uhdef.map_clone())?;
    write_pool_indices(&ud, &mut pool, "data.uhman.bin", |x| x.uhman.map_clone())?;
    write_sparse(&ud, "data.bits.bin", 0, u8_writer, |x| if x.bits > 0 { Some(x.bits) } else { None })?;
    write_sparse(&ud, "data.hlvt.bin", 0, u16_writer, |x| x.hlvt.map(|(l, v, t)| {
        assert!(l < (1 << 5) && v < (1 << 5) && t < (1 << 5));
        return (1 << 15 | l << 10 | v << 5 | t) as u16;
    }))?;
    write("data.pagebits.bin", |mut sink| {
        for page in ud.chunks(256) {
            let mut value = 0;
            if page.iter().filter(|x| x.name.is_some() || x.bits & Bits::DerivedNameNr1 as u8 != 0).count() > 0 {
                value |= PageBits::HasAnyNameExceptNr2 as u8;
            }
            if page.iter().filter(|x| x.uhdef.is_some()).count() > 0 {
                value |= PageBits::HasAnyUhdef as u8;
            }
            if page.iter().filter(|x| x.nacorr.is_some()).count() > 0 {
                value |= PageBits::HasAnyNacorr as u8;
            }
            if page.iter().filter(|x| x.nacont.is_some()).count() > 0 {
                value |= PageBits::HasAnyNacont as u8;
            }
            if page.iter().filter(|x| x.naalte.is_some()).count() > 0 {
                value |= PageBits::HasAnyNaalte as u8;
            }
            if page.iter().filter(|x| x.nafigm.is_some()).count() > 0 {
                value |= PageBits::HasAnyNafigm as u8;
            }
            if page.iter().filter(|x| x.naabbr.is_some()).count() > 0 {
                value |= PageBits::HasAnyNaabbr as u8;
            }
            if page.iter().filter(|x| x.nau1.is_some()).count() > 0 {
                value |= PageBits::HasAnyNau1 as u8;
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

fn write_sparse<T: Copy, G: FnMut(&Details) -> Option<T>, W: FnMut(&mut BufWriter<File>, T) -> Result<(), Error>>(
    source: &Vec<Details>,
    path: &str,
    default: T,
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
    pool: &mut Pool,
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
