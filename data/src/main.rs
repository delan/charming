mod age;
mod block;
mod captures;
mod details;
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

use byteorder::{BigEndian, WriteBytesExt};
use failure::Error;

use crate::age::age_handler;
use crate::block::block_handler;
use crate::details::Details;
use crate::ed::ed_handler;
use crate::gc::gc_handler;
use crate::na::na_handler;
use crate::parse::parse;
use crate::pool::{Pool, Popularity};
use crate::ud::ud_handler;
use crate::ur::ur_handler;

fn main() -> Result<(), Error> {
    let mut gc_labels = HashMap::default();

    parse(
        &mut gc_labels,
        gc_handler,
        "PropertyValueAliases.txt",
        r"^gc *; *(?P<key>[^ ]+) *; *(?P<value>([^ ]+))",
    )?;

    let mut ud = points();

    parse(
        &mut ud,
        |sink, captures| ud_handler(&gc_labels, sink, captures),
        "UnicodeData.txt",
        r"^(?P<point>[0-9A-F]+);(?P<name>[^;]+);(?P<gc>[^;]+)",
    )?;

    parse(
        &mut ud,
        block_handler,
        "Blocks.txt",
        r"^(?P<first>[0-9A-F]+)[.][.](?P<last>[0-9A-F]+); (?P<value>.+)",
    )?;

    parse(
        &mut ud,
        age_handler,
        "DerivedAge.txt",
        r"^(?P<first>[0-9A-F]+)(?:[.][.](?P<last>[0-9A-F]+))?\s*;\s*(?P<value>[^ ]+)",
    )?;

    parse(
        &mut ud,
        na_handler,
        "NameAliases.txt",
        r"^(?P<point>[0-9A-F]+);(?P<alias>[^;]+);(?P<type>[^;]+)",
    )?;

    parse(
        &mut ud,
        ur_handler,
        "Unihan_Readings.txt",
        r"^U[+](?P<point>[0-9A-F]+)\t(?P<key>kMandarin|kDefinition)\t(?P<value>.+)",
    )?;

    parse(
        &mut ud,
        ed_handler,
        "emoji-data.txt",
        r"^(?P<first>[0-9A-F]+)(?:[.][.](?P<last>[0-9A-F]+))?\s*;\s*(?P<value>[^ ]+)",
    )?;

    let mut popularity = Popularity::default();

    vote(&mut popularity, &ud, |x| x.name.as_ref());
    vote(&mut popularity, &ud, |x| x.gc.as_ref());
    vote(&mut popularity, &ud, |x| x.block.as_ref());
    vote(&mut popularity, &ud, |x| x.age.as_ref());
    vote(&mut popularity, &ud, |x| x.mpy.as_ref());

    let popularity = popularity.report();

    write("../data.string.json", |mut sink| {
        write!(sink, "{}", serde_json::to_string(&popularity)?)?;

        Ok(())
    })?;

    let mut pool = Pool::default();

    for string in popularity {
        pool.r#use(&string);
    }

    write_pool_indices(&ud, &mut pool, "../data.name.bin", |x| x.name.as_ref())?;
    write_pool_indices(&ud, &mut pool, "../data.gc.bin", |x| x.gc.as_ref())?;
    write_pool_indices(&ud, &mut pool, "../data.block.bin", |x| x.block.as_ref())?;
    write_pool_indices(&ud, &mut pool, "../data.age.bin", |x| x.age.as_ref())?;
    write_pool_indices(&ud, &mut pool, "../data.mpy.bin", |x| x.mpy.as_ref())?;

    Ok(())
}

fn points<T: Default>() -> Vec<T> {
    let mut result = Vec::with_capacity(0x110000);
    result.resize_with(0x110000, Default::default);

    result
}

fn vote<G: FnMut(&Details) -> Option<&String>>(
    sink: &mut Popularity,
    source: &Vec<Details>,
    mut getter: G,
) {
    for details in source {
        if let Some(string) = getter(details) {
            sink.vote(string);
        }
    }
}

fn write<W: FnOnce(BufWriter<File>) -> Result<(), Error>>(
    path: &str,
    writer: W,
) -> Result<(), Error> {
    println!("Writing {} ...", path);

    writer(BufWriter::new(File::create(path)?))
}

fn write_pool_indices<G: FnMut(&Details) -> Option<&String>>(
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
                sink.write_u16::<BigEndian>(index)?;
            } else {
                sink.write_u16::<BigEndian>(0xFFFF)?;
            }
        }

        Ok(())
    })
}
