use std::fs::File;
use std::io::{BufRead, BufReader};

use failure::Error;
use regex::{Captures, Regex};

pub(crate) fn parse<R, H: FnMut(&mut R, Captures) -> Result<(), Error>>(
    sink: &mut R,
    mut handler: H,
    path: &str,
    pattern: &str,
) -> Result<(), Error> {
    eprintln!("Processing {} ...", path);

    let source = BufReader::new(File::open(path)?);
    let pattern = Regex::new(pattern)?;

    for line in source.lines() {
        if let Some(captures) = pattern.captures(&line?) {
            handler(sink, captures)?;
        }
    }

    Ok(())
}
