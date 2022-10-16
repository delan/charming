use std::{collections::BTreeMap, rc::Rc};

#[derive(Debug)]
pub struct Sequences {
    pub buckets: BTreeMap<SequenceKey, Vec<Sequence>>,
}

pub type SequenceKey = (usize, usize);

#[derive(Debug)]
pub struct Sequence {
    pub points: Vec<usize>,
    pub names: Vec<Rc<str>>,
}

impl Default for Sequences {
    fn default() -> Self {
        Self { buckets: BTreeMap::default() }
    }
}

impl Sequences {
    pub fn insert(&mut self, points: &[usize], name: Rc<str>) {
        let bucket = self.buckets.entry(key(points))
            .or_default();

        for sequence in bucket.iter_mut() {
            if sequence.points == points {
                sequence.names.push(name);
                return;
            }
        }

        bucket.push(Sequence {
            points: points.to_owned(),
            names: vec![name],
        })
    }
}

pub fn key(points: &[usize]) -> SequenceKey {
    (points[0], points[1])
}
