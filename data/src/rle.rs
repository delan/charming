use std::convert::TryInto;
use std::fmt::{self, Debug, Formatter};

#[derive(Debug)]
enum Raw {
    Single(usize),
    Repeat(usize, usize),
}

pub(crate) enum Run {
    Literal(Vec<usize>),
    Repeat(usize, usize),
}

impl Debug for Run {
    fn fmt(&self, sink: &mut Formatter) -> Result<(), fmt::Error> {
        match self {
            Run::Literal(indices) => write!(sink, "Literal(<{:?}> {:?})", indices.len(), indices),
            Run::Repeat(index, length) => write!(sink, "Repeat(<{:?}> {:?})", length, index),
        }
    }
}

pub(crate) fn rle<S: IntoIterator<Item = usize>>(source: S) -> Vec<Run> {
    source
        // run-length encode: a a a b c c → (a, 3) (b, 1) (c, 2)
        .into_iter()
        .fold(Vec::default(), |mut result, x| {
            if let Some((index, ref mut length)) = result.last_mut() {
                if x == *index {
                    *length += 1;
                    return result;
                }
            }

            result.push((x, 1));

            result
        })
        // split short runs: (x, 0x100) (y, 3) → R(x, 0x100) S(y) S(y) S(y)
        .drain(..)
        .fold(Vec::default(), |mut result, (index, length)| {
            if length < 0x100 {
                for _ in 0..length {
                    result.push(Raw::Single(index));
                }
            } else {
                result.push(Raw::Repeat(index, length));
            }

            result
        })
        // join single runs: R(x, 0x100) S(y) S(z) → R(x, 0x100) L(y z)
        .drain(..)
        .fold(Vec::default(), |mut result, raw| {
            if let Some(Run::Literal(ref mut indices)) = result.last_mut() {
                if let Raw::Single(index) = raw {
                    indices.push(index);
                    return result;
                }
            }

            result.push(match raw {
                Raw::Single(index) => Run::Literal(vec![index]),
                Raw::Repeat(index, length) => Run::Repeat(index, length),
            });

            result
        })
}

pub(crate) fn pack<S: IntoIterator<Item = Run>>(source: S) -> Vec<u16> {
    let mut result = Vec::default();

    // split long runs: R(x, 0x10000) → R(x, 0x7FFF) R(x, 0x7FFF) R(x, 2)
    let source = source.into_iter().fold(Vec::default(), |mut result, run| {
        match run {
            Run::Literal(mut indices) => {
                while indices.len() > 0 {
                    let new = indices.len().min(0x7FFF);
                    result.push(Run::Literal(indices[..new].into()));
                    indices = indices[new..].into();
                }
            }
            Run::Repeat(index, mut length) => {
                while length > 0 {
                    let new = length.min(0x7FFF);
                    result.push(Run::Repeat(index, new));
                    length -= new;
                }
            }
        }

        result
    });

    println!("{} runs", source.len());

    for run in &source {
        println!("{:?}", run);
    }

    // first: number of runs n
    result.push(source.len().try_into().unwrap());

    // second: n * run length code cᵢ
    // 0 || <15-bit length lᵢ> → literal
    // 1 || <15-bit length lᵢ> → repeat
    for run in &source {
        match run {
            Run::Literal(indices) => {
                assert!(indices.len() < 0x8000);
                result.push(0 << 15 | indices.len() as u16);
            }
            Run::Repeat(_, length) => {
                assert!(*length < 0x8000);
                result.push(1 << 15 | *length as u16);
            }
        }
    }

    // third: indices
    // literal cᵢ → lᵢ * index xᵢⱼ
    // literal cᵢ → index xᵢ
    for run in &source {
        match run {
            Run::Literal(indices) => {
                for &index in indices {
                    result.push(index.try_into().unwrap());
                }
            }
            Run::Repeat(index, _) => {
                let index = *index;
                result.push(index.try_into().unwrap());
            }
        }
    }

    result
}
