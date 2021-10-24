mod age;
mod block;
mod captures;
mod details;
mod dynamic;
mod ed;
mod gc;
mod na;
mod parse;
mod pool;
mod range;
mod ud;
mod ur;

use std::collections::HashMap;
use std::fs::File;
use std::io::{BufWriter, Write};
use std::rc::Rc;

use byteorder::{BigEndian, WriteBytesExt};
use failure::Error;

use crate::age::age_handler;
use crate::block::block_handler;
use crate::details::{Bits, Details};
use crate::dynamic::{NAME_RULES, NameRule};
use crate::ed::ed_handler;
use crate::gc::gc_handler;
use crate::na::na_handler;
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
        r"^(?P<point>[0-9A-F]+);(?P<name>[^;]+);(?P<gc>[^;]+)",
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
        |sink, captures| na_handler(&mut popularity, sink, captures),
        "NameAliases.txt", None,
        r"^(?P<point>[0-9A-F]+);(?P<alias>[^;]+);(?P<type>[^;]+)",
    )?;

    // Some characters have names that can be derived by algorithmic
    // rules. UnicodeData.txt often uses ranges (see above) to define
    // properties for these characters in bulk, but others are listed
    // individually due to their unique properties.
    for (first, last, _, _) in NAME_RULES {
        for i in first..=last {
            // Each character with a derived name should either have
            // no explicit name (iff defined in bulk) or an explicit
            // name that matches its derived name.
            assert!(ud[i].name.as_deref().map_or(true, |x| Some(x) == derived_name(i).as_deref()));

            // Strip out all derived names from output data, to avoid
            // polluting string pool and client heap.
            ud[i].name = None;
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
    assert_eq!(ud[0x5170], Details::r#static(None, "Other Letter (Lo)", "CJK Unified Ideographs", "Unicode 1.1", "orchid; elegant, graceful", "lán", &[Bits::KdefinitionExists]));
    assert_eq!(ud[0x9FFF], Details::r#static(None, "Other Letter (Lo)", "CJK Unified Ideographs", "Unicode 14.0", None, None, &[]));
    assert_eq!(ud[0xF900], Details::r#static(None, "Other Letter (Lo)", "CJK Compatibility Ideographs", "Unicode 1.1", "how? what?", None, &[Bits::KdefinitionExists]));

    let report = popularity.report();

    write("data.string.json", |mut sink| {
        write!(sink, "{}", serde_json::to_string(&report)?)?;

        Ok(())
    })?;

    let mut pool = Pool::from(&report);

    write_pool_indices(&ud, &mut pool, "data.name.bin", |x| x.name.map_clone())?;
    write_pool_indices(&ud, &mut pool, "data.gc.bin", |x| x.gc.map_clone())?;
    write_pool_indices(&ud, &mut pool, "data.block.bin", |x| x.block.map_clone())?;
    write_pool_indices(&ud, &mut pool, "data.age.bin", |x| x.age.map_clone())?;
    write_pool_indices(&ud, &mut pool, "data.uhdef.bin", |x| x.uhdef.map_clone())?;
    write_pool_indices(&ud, &mut pool, "data.uhman.bin", |x| x.uhman.map_clone())?;

    write("data.bits.bin", |mut sink| {
        for details in ud {
            sink.write_u8(details.bits)?;
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

fn write_pool_indices<G: FnMut(&Details) -> Option<Rc<str>>>(
    source: &Vec<Details>,
    pool: &mut Pool,
    path: &str,
    mut getter: G,
) -> Result<(), Error> {
    write(path, |mut sink| {
        for details in source {
            if let Some(string) = getter(details) {
                let index = pool.r#use(&string);
                assert!(index < 0xFFFF);
                sink.write_u16::<BigEndian>(index as u16)?;
            } else {
                sink.write_u16::<BigEndian>(0xFFFF)?;
            }
        }

        Ok(())
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
