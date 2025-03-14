use std::fs::File;
use std::io::{BufRead, BufReader};

use color_eyre::eyre::Result;
use regex::{Captures, Regex};

pub(crate) fn parse<R, H: FnMut(&mut R, Captures) -> Result<()>>(
    sink: &mut R,
    mut handler: H,
    path: &str,
    label: impl Into<Option<&'static str>>,
    pattern: &str,
) -> Result<()> {
    if let Some(label) = label.into() {
        println!("Processing {} ({}) ...", path, label);
    } else {
        println!("Processing {} ...", path);
    }

    let source = BufReader::new(File::open(path)?);
    let pattern = Regex::new(pattern)?;

    for line in source.lines() {
        if let Some(captures) = pattern.captures(&line?) {
            handler(sink, captures)?;
        }
    }

    Ok(())
}
