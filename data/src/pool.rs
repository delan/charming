use std::collections::{HashMap, HashSet};
use std::convert::TryInto;
use std::rc::Rc;

#[derive(Debug, Default)]
pub(crate) struct Popularity {
    inner: HashSet<Rc<str>>,
}

#[derive(Debug, Default)]
pub(crate) struct Pool {
    inner: HashMap<String, u16>,
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

    pub fn report(&self) -> Vec<Rc<str>> {
        let mut result: Vec<_> = self.inner.iter().map(|x| x.clone()).collect();
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
    pub fn r#use(&mut self, string: &str) -> u16 {
        if let Some(&result) = self.inner.get(string) {
            return result;
        }

        let result = self.inner.len().try_into().unwrap();
        assert!(result < 0xFFFF);
        // FIXME avoid copy
        self.inner.insert(string.to_owned(), result);

        result
    }
}
