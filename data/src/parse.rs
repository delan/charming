use std::fs::File;
use std::io::{BufRead, BufReader};

use failure::Error;
use regex::{Captures, Regex};

pub(crate) fn parse<R>(
    sink: &mut R,
    handler: fn(&mut R, Captures) -> Result<(), Error>,
    path: &str,
    pattern: &str,
) -> Result<(), Error> {
    let source = BufReader::new(File::open(path)?);
    let pattern = Regex::new(pattern)?;

    for line in source.lines() {
        if let Some(captures) = pattern.captures(&line?) {
            handler(sink, captures)?;
        }
    }

    Ok(())
}
