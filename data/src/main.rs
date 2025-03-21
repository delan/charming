mod age;
mod block;
mod captures;
mod details;
mod dynamic;
mod ed;
mod et;
mod gbp;
mod gc;
mod hst;
mod jamo;
mod na;
mod ns;
mod page;
mod parse;
mod pool;
mod range;
mod sequence;
mod uax29;
mod ud;
mod ur;

use std::collections::HashMap;
use std::convert::TryInto;
use std::fmt::Debug;
use std::fs::{self, File};
use std::io::{BufWriter, Write};
use std::rc::Rc;

use byteorder::{BigEndian, WriteBytesExt};
use color_eyre::eyre;
use serde::Serialize;

use crate::age::age_handler;
use crate::block::block_handler;
use crate::details::{Bits, Details, EmojiBits, GraphemeBreak, HangulSyllableType};
use crate::dynamic::{hangul_lvt_indices, NameRule, NAME_RULES};
use crate::ed::ed_handler;
use crate::et::et_handler;
use crate::gbp::gbp_handler;
use crate::gc::gc_handler;
use crate::hst::hst_handler;
use crate::jamo::jamo_handler;
use crate::na::na_handler;
use crate::ns::ns_handler;
use crate::page::PageBits;
use crate::parse::parse;
use crate::pool::{Pool, Popularity};
use crate::sequence::Sequences;
use crate::uax29::generate_egcbreak;
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

fn main() -> eyre::Result<()> {
    color_eyre::install()?;
    let mut gc_labels = HashMap::default();

    parse(
        &mut gc_labels,
        gc_handler,
        "PropertyValueAliases.txt",
        None,
        r"^gc *; *(?P<key>[^ ]+) *; *(?P<value>([^ ]+))",
    )?;

    let mut popularity = Popularity::default();
    let mut ud = points();
    let mut ud_ranges = HashMap::default();

    parse(
        &mut ud,
        |_, captures| ud_range_handler(&mut ud_ranges, captures),
        "UnicodeData.txt",
        "ranges",
        r"^(?P<point>[0-9A-F]+);<(?P<name>[^;]+), (?P<kind>First|Last)>",
    )?;

    parse(
        &mut ud,
        |sink, captures| ud_handler(&gc_labels, &mut popularity, sink, captures),
        "UnicodeData.txt",
        "all",
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
        "Blocks.txt",
        None,
        r"^(?P<first>[0-9A-F]+)[.][.](?P<last>[0-9A-F]+); (?P<value>.+)",
    )?;

    parse(
        &mut ud,
        |sink, captures| age_handler(&mut popularity, sink, captures),
        "DerivedAge.txt",
        None,
        r"^(?P<first>[0-9A-F]+)(?:[.][.](?P<last>[0-9A-F]+))?\s*;\s*(?P<value>[^ ]+)",
    )?;

    parse(
        &mut ud,
        |sink, captures| hst_handler(sink, captures),
        "HangulSyllableType.txt",
        None,
        r"^(?P<first>[0-9A-F]+)(?:[.][.](?P<last>[0-9A-F]+))?\s*;\s*(?P<value>[^ ]+)",
    )?;

    parse(
        &mut ud,
        |sink, captures| jamo_handler(&mut popularity, sink, captures),
        "Jamo.txt",
        None,
        r"^(?P<point>[0-9A-F]+)\s*;\s*(?P<value>[^ #]*)",
    )?;

    for i in 0..ud.len() {
        ud[i].hlvt = hangul_lvt_indices(&ud, i);
    }

    parse(
        &mut ud,
        |sink, captures| na_handler(&mut popularity, sink, captures),
        "NameAliases.txt",
        None,
        r"^(?P<point>[0-9A-F]+);(?P<alias>[^;]+);(?P<type>[^;]+)",
    )?;

    // Some characters have names that can be derived by algorithmic
    // rules. UnicodeData.txt often uses ranges (see above) to define
    // properties for these characters in bulk, but others are listed
    // individually due to their unique properties.
    for (first, last, rule, prefix) in NAME_RULES {
        for (i, item) in ud.iter_mut().enumerate().take(last + 1).skip(first) {
            // Each character with a derived name should either have
            // no explicit name (iff defined in bulk) or an explicit
            // name that matches its derived name.
            assert!(item
                .name
                .as_deref()
                .is_none_or(|x| Some(x) == derived_name(i).as_deref()));

            // Strip out all derived names from output data, to avoid
            // polluting string pool and client heap.
            item.name = None;

            item.dnrp = Some(popularity.vote(prefix));
            item.bits |= match rule {
                NameRule::NR1 => Bits::DerivedNameNr1,
                NameRule::NR2 => Bits::DerivedNameNr2,
            };
        }
    }

    parse(
        &mut ud,
        |sink, captures| ur_handler(&mut popularity, sink, captures),
        "Unihan_Readings.txt",
        None,
        r"^U[+](?P<point>[0-9A-F]+)\t(?P<key>kMandarin|kDefinition)\t(?P<value>.+)",
    )?;

    parse(
        &mut ud,
        |sink, captures| ed_handler(sink, captures),
        "emoji-data.txt",
        None,
        r"^(?P<first>[0-9A-F]+)(?:[.][.](?P<last>[0-9A-F]+))?\s*;\s*(?P<property>Emoji|Extended_Pictographic|Emoji_Component|Emoji_Presentation|Emoji_Modifier|Emoji_Modifier_Base)(\s|#|$)",
    )?;

    let mut sequences = Sequences::default();

    parse(
        &mut ud,
        |_, captures| ns_handler(&mut popularity, &mut sequences, captures),
        "NamedSequences.txt",
        None,
        r"^(?P<name>[^#].*)\s*;\s*(?P<points>[0-9A-F]+(?: [0-9A-F]+)*)",
    )?;

    parse(
        &mut ud,
        |sink, captures| et_handler(&mut popularity, sink, &mut sequences, captures),
        "emoji-test.txt",
        None,
        r"^(?P<points>[0-9A-F]+(?: [0-9A-F]+)*)\s*;\s*fully-qualified\s*# .* E[0-9]+[.][0-9]+ (?P<name>.+)",
    )?;

    parse(
        &mut ud,
        |sink, captures| gbp_handler(sink, captures),
        "GraphemeBreakProperty.txt",
        None,
        r"^(?P<first>[0-9A-F]+)(?:[.][.](?P<last>[0-9A-F]+))?\s*;\s*(?P<value>[^ ]+)",
    )?;

    // TODO add test cases for ebits
    println!("Running tests ...");
    use crate::details::AliasType::*;
    assert_eq!(
        ud[0x0000],
        Details::builder()
            .alias(&[("NULL", Unicode1), ("NULL", Control), ("NUL", Abbreviation)])
            .gb(GraphemeBreak::Control)
            .gc("Control (Cc)")
            .block("Basic Latin")
            .age("Unicode 1.1")
            .build(),
    );

    assert_eq!(
        ud[0x000A],
        Details::builder()
            .alias(&[
                ("LINE FEED (LF)", Unicode1),
                ("LINE FEED", Control),
                ("NEW LINE", Control),
                ("END OF LINE", Control),
                ("LF", Abbreviation),
                ("NL", Abbreviation),
                ("EOL", Abbreviation),
            ])
            .gb(GraphemeBreak::Lf)
            .gc("Control (Cc)")
            .block("Basic Latin")
            .age("Unicode 1.1")
            .build()
    );
    assert_eq!(
        ud[0x0080],
        Details::builder()
            .alias(&[("PADDING CHARACTER", Figment), ("PAD", Abbreviation)])
            .gb(GraphemeBreak::Control)
            .gc("Control (Cc)")
            .block("Latin-1 Supplement")
            .age("Unicode 1.1")
            .build()
    );
    assert_eq!(
        ud[0x039B],
        Details::builder()
            .name("GREEK CAPITAL LETTER LAMDA")
            .alias(&[("GREEK CAPITAL LETTER LAMBDA", Unicode1)])
            .gc("Uppercase Letter (Lu)")
            .block("Greek and Coptic")
            .age("Unicode 1.1")
            .build(),
    );
    assert_eq!(
        ud[0x5170],
        Details::builder()
            .dnrp("CJK UNIFIED IDEOGRAPH-")
            .gc("Other Letter (Lo)")
            .block("CJK Unified Ideographs")
            .age("Unicode 1.1")
            .uhdef("orchid; elegant, graceful")
            .uhman("lán")
            .bits(Bits::KdefinitionExists | Bits::DerivedNameNr2)
            .build()
    );
    assert_eq!(
        ud[0x9FFF],
        Details::builder()
            .dnrp("CJK UNIFIED IDEOGRAPH-")
            .gc("Other Letter (Lo)")
            .block("CJK Unified Ideographs")
            .age("Unicode 14.0")
            .uhman("xìng")
            .bits(Bits::DerivedNameNr2.into())
            .build()
    );
    assert_eq!(
        ud[0xD4DB],
        Details::builder()
            .dnrp("HANGUL SYLLABLE ")
            .gb(GraphemeBreak::HangulLVT)
            .gc("Other Letter (Lo)")
            .block("Hangul Syllables")
            .age("Unicode 2.0")
            .hst(HangulSyllableType::Lvt)
            .hlvt((17, 16, 15))
            .bits(Bits::DerivedNameNr1.into())
            .build()
    );
    assert_eq!(
        ud[0xD788],
        Details::builder()
            .dnrp("HANGUL SYLLABLE ")
            .gb(GraphemeBreak::HangulLV)
            .gc("Other Letter (Lo)")
            .block("Hangul Syllables")
            .age("Unicode 2.0")
            .hst(HangulSyllableType::Lv)
            .hlvt((18, 20, 0))
            .bits(Bits::DerivedNameNr1.into())
            .build()
    );

    assert_eq!(
        ud[0xF900],
        Details::builder()
            .dnrp("CJK COMPATIBILITY IDEOGRAPH-")
            .gc("Other Letter (Lo)")
            .block("CJK Compatibility Ideographs")
            .age("Unicode 1.1")
            .uhdef("how? what?")
            .bits(Bits::DerivedNameNr2 | Bits::KdefinitionExists)
            .build()
    );
    assert_eq!(
        ud[0xFE18],
        Details::builder()
            .name("PRESENTATION FORM FOR VERTICAL RIGHT WHITE LENTICULAR BRAKCET")
            .alias(&[(
                "PRESENTATION FORM FOR VERTICAL RIGHT WHITE LENTICULAR BRACKET",
                Correction,
            )])
            .gc("Close Punctuation (Pe)")
            .block("Vertical Forms")
            .age("Unicode 4.1")
            .build()
    );
    assert_eq!(
        ud[0xFEFF],
        Details::builder()
            .name("ZERO WIDTH NO-BREAK SPACE")
            .alias(&[
                ("BYTE ORDER MARK", Unicode1),
                ("BYTE ORDER MARK", Alternate),
                ("BOM", Abbreviation),
                ("ZWNBSP", Abbreviation),
            ])
            .gb(GraphemeBreak::Control)
            .gc("Format (Cf)")
            .block("Arabic Presentation Forms-B")
            .age("Unicode 1.1")
            .build()
    );

    if let Some(twemoji) = std::env::args().nth(1) {
        let twemoji_path = format!("../helper/twemoji-{}/assets/svg", twemoji);
        println!("Fixing twemoji in {} ...", twemoji_path);
        for entry in fs::read_dir(twemoji_path)? {
            let entry = entry?;
            let path = entry.path();
            let name = path.file_name().expect("path has no name");
            let name = name.to_str().expect("name is not unicode");
            let stem = path.file_stem().expect("path has no stem");
            let stem = stem.to_str().expect("stem is not unicode");
            let extension = path.extension().expect("path has no extension");
            let extension = extension.to_str().expect("extension is not unicode");
            let points = stem
                .split("-")
                .map(|x| usize::from_str_radix(x, 16).unwrap())
                .collect::<Vec<_>>();
            let mut new_points = Vec::default();
            for (i, &point) in points.iter().enumerate() {
                let ebits = ud[point].ebits;
                let e = ebits.contains(EmojiBits::Emoji);
                let ep = ebits.contains(EmojiBits::EmojiPresentation);
                let emb = ebits.contains(EmojiBits::EmojiModifierBase);
                let next_point = points.get(i + 1);
                let next_is_vs16 = next_point.is_some_and(|&x| x == 0xFE0F);
                let next_ebits = next_point.map(|&j| ud[j].ebits);
                let next_em = next_ebits.is_some_and(|x| x.contains(EmojiBits::EmojiModifier));
                new_points.push(point);
                if !e || ep || next_is_vs16 || emb && next_em {
                    continue;
                }
                if !emb && next_em {
                    eprintln!(
                        "Warning: {}: tolerating non-RGI emoji modifier sequence",
                        name
                    );
                } else {
                    // eprintln!("Warning: {}: U+{:04X} without VS16 or Emoji_Modifier", point, name);
                    new_points.push(0xFE0F);
                }
            }
            if new_points != points {
                let new_points = new_points
                    .iter()
                    .map(|x| format!("{:x}", x))
                    .collect::<Vec<_>>();
                let new = path.with_file_name(new_points.join("-"));
                let new = new.with_extension(extension);
                eprintln!("mv {} {:?}", name, new);
                fs::rename(path, new)?;
            }
        }
    }

    write("egcbreak.ts", |mut sink| {
        Ok(writeln!(
            sink,
            "export const EGCBREAK = /{}/g;",
            generate_egcbreak()?
        )?)
    })?;

    let report = popularity.report();

    // use bin rather than json to avoid confusing typescript
    write("data.string.bin", |mut sink| {
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
    write_sparse(&ud, "data.bits.bin", 0, u8_writer, |x| {
        if !x.bits.is_empty() {
            Some(x.bits.bits())
        } else {
            None
        }
    })?;
    write_sparse(&ud, "data.ebits.bin", 0, u8_writer, |x| {
        if !x.ebits.is_empty() {
            Some(x.ebits.bits())
        } else {
            None
        }
    })?;
    write_sparse(&ud, "data.hlvt.bin", 0, u16_writer, |x| {
        x.hlvt.map(|(l, v, t)| {
            assert!(l < (1 << 5) && v < (1 << 5) && t < (1 << 5));
            ((1 << 15) | (l << 10) | (v << 5) | t) as u16
        })
    })?;
    write_sparse(&ud, "data.gb.bin", 0, u8_writer, |x| x.gb.map(|x| x as u8))?;
    write_alias_files(&ud, &pool)?;
    write_sequence_files(&sequences, &pool)?;
    write("data.pagebits.bin", |mut sink| {
        for page in ud.chunks(256) {
            let mut value = 0;
            if page
                .iter()
                .filter(|x| x.name.is_some() || x.bits.contains(Bits::DerivedNameNr1))
                .count()
                > 0
            {
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
    write("data.info.json", |mut sink| {
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct DataInfo {
            sequence_bucket_count: usize,
            sequence_count: usize,
        }

        write!(
            sink,
            "{}",
            serde_json::to_string(&DataInfo {
                sequence_bucket_count: sequences.buckets.len(),
                sequence_count: sequences.buckets.values().fold(0, |a, x| a + x.len()),
            })?
        )?;

        Ok(())
    })?;

    Ok(())
}

fn points<T: Default>() -> Vec<T> {
    let mut result = Vec::with_capacity(0x110000);
    result.resize_with(0x110000, Default::default);

    result
}

fn write<W: FnOnce(BufWriter<File>) -> eyre::Result<()>>(
    path: &str,
    writer: W,
) -> eyre::Result<()> {
    println!("Writing {} ...", path);

    writer(BufWriter::new(File::create(path)?))
}

fn u8_writer(sink: &mut BufWriter<File>, x: u8) -> eyre::Result<()> {
    sink.write_u8(x)?;

    Ok(())
}

fn u16_writer(sink: &mut BufWriter<File>, x: u16) -> eyre::Result<()> {
    sink.write_u16::<BigEndian>(x)?;

    Ok(())
}

fn u32_writer(sink: &mut BufWriter<File>, x: u32) -> eyre::Result<()> {
    sink.write_u32::<BigEndian>(x)?;

    Ok(())
}

fn write_sparse<
    T,
    U: Copy + PartialEq + Debug,
    G: FnMut(&T) -> Option<U>,
    W: FnMut(&mut BufWriter<File>, U) -> eyre::Result<()>,
>(
    source: &[T],
    path: &str,
    default: U,
    mut writer: W,
    mut getter: G,
) -> eyre::Result<()> {
    write(path, |mut sink| {
        let mut page_counts = Vec::default();

        for i in 0..(source.len() / 256) {
            page_counts.push(
                source[(i * 256)..][..256]
                    .iter()
                    .filter(|x| getter(x).is_some())
                    .count(),
            );
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
                    let value = getter(&source[i * 256 + j]);
                    assert_ne!(value, Some(default));
                    writer(&mut sink, value.unwrap_or(default))?;
                }
            }
        }

        Ok(())
    })
}

fn write_pool_indices<G: FnMut(&Details) -> Option<Rc<str>>>(
    source: &[Details],
    pool: &Pool,
    path: &str,
    mut getter: G,
) -> eyre::Result<()> {
    write_sparse(source, path, 0xFFFF, u16_writer, |x| {
        getter(x).map(|x| pool.r#use(&x).try_into().expect("string pool overflow"))
    })
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

fn write_alias_files(source: &[Details], pool: &Pool) -> eyre::Result<()> {
    let mut counts = Vec::default();
    let mut indices = Vec::default();
    let mut strings = Vec::default();
    let mut types = Vec::default();
    let mut index = 0u16;

    for details in source {
        let count = match details.alias.len() {
            0 => None,
            x => Some(x.try_into().expect("alias count overflow")),
        };
        counts.push(count);
        indices.push(count.map(|_| index));
        index = index
            .checked_add(count.unwrap_or(0).into())
            .expect("alias index overflow");
        for alias in &details.alias {
            strings.push(pool.r#use(&alias.inner));
            types.push(alias.r#type);
        }
    }

    write_sparse(&counts, "data.aliasc.bin", 0, u8_writer, |&x| x)?;

    write_sparse(&indices, "data.aliasi.bin", 0xFFFF, u16_writer, |&x| x)?;

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

fn write_sequence_files(sequences: &Sequences, pool: &Pool) -> eyre::Result<()> {
    write("data.seqb.bin", |mut sink| {
        let mut start = 0;

        for (key, bucket) in sequences.buckets.iter() {
            let len = bucket
                .len()
                .try_into()
                .expect("sequence bucket len overflow");
            // eprintln!("{:04X}\t{:04X}\t{}\t{}", key.0, key.1, start, len);
            u32_writer(&mut sink, key.0.try_into().unwrap())?;
            u32_writer(&mut sink, key.1.try_into().unwrap())?;
            u16_writer(&mut sink, start)?;
            u8_writer(&mut sink, len)?;
            start = start
                .checked_add(len.into())
                .expect("sequence bucket start overflow");
        }

        Ok(())
    })?;

    write("data.seqp.bin", |mut sink| {
        let mut start = 0;
        for bucket in sequences.buckets.values() {
            for sequence in bucket {
                let len = sequence
                    .points
                    .len()
                    .try_into()
                    .expect("sequence points len overflow");
                // let debug = sequence.points.iter().map(|x| format!("{:04X}", x)).reduce(|a, x| format!("{} {}", a, x)).unwrap();
                // eprintln!("{}\t{}\t{}", start, len, debug);
                u16_writer(&mut sink, start)?;
                u8_writer(&mut sink, len)?;
                start = start
                    .checked_add(len.into())
                    .expect("sequence points start overflow");
            }
        }

        for bucket in sequences.buckets.values() {
            for sequence in bucket {
                for &point in sequence.points.iter() {
                    u32_writer(&mut sink, point.try_into().unwrap())?;
                }
            }
        }

        Ok(())
    })?;

    write("data.seqn.bin", |mut sink| {
        let mut start = 0;
        for bucket in sequences.buckets.values() {
            for sequence in bucket {
                let len = sequence
                    .names
                    .len()
                    .try_into()
                    .expect("sequence names len overflow");
                // let debug = sequence.points.iter().map(|x| format!("{:04X}", x)).reduce(|a, x| format!("{} {}", a, x)).unwrap();
                // eprintln!("{}\t{}\t{}", start, len, debug);
                u16_writer(&mut sink, start)?;
                u8_writer(&mut sink, len)?;
                start = start
                    .checked_add(len.into())
                    .expect("sequence names start overflow");
            }
        }

        for bucket in sequences.buckets.values() {
            for sequence in bucket {
                for name in sequence.names.iter() {
                    let string = pool.r#use(name);
                    u16_writer(&mut sink, string.try_into().expect("string pool overflow"))?;
                }
            }
        }

        Ok(())
    })?;

    Ok(())
}
