use std::collections::{HashMap, HashSet};
use std::rc::Rc;

#[derive(Debug, Default)]
pub(crate) struct Popularity {
    inner: HashSet<Rc<str>>,
}

#[derive(Debug, Default)]
pub(crate) struct Pool {
    inner: HashMap<Rc<str>, usize>,
}

impl Popularity {
    pub fn vote(&mut self, string: &str) -> Rc<str> {
        if let Some(result) = self.inner.get(string) {
            return result.clone();
        }

        let result: Rc<str> = string.to_owned().into();

        self.inner.insert(result.clone());

        result
    }

    pub fn report(mut self) -> Vec<Rc<str>> {
        let mut result: Vec<_> = self
            .inner
            .drain()
            .filter(|x| Rc::strong_count(x) > 1)
            .collect();

        result.sort_by(|p, q| {
            Rc::strong_count(p)
                .cmp(&Rc::strong_count(q))
                .reverse()
                .then_with(|| p.cmp(q))
        });

        result
    }
}

impl Pool {
    pub fn r#use(&self, string: &str) -> usize {
        self.inner[string]
    }
}

impl From<&Vec<Rc<str>>> for Pool {
    fn from(report: &Vec<Rc<str>>) -> Self {
        let mut result = Self::default();

        for string in report {
            result.inner.insert(string.clone(), result.inner.len());
        }

        result
    }
}
