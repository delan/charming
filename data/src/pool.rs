use std::collections::HashMap;
use std::convert::TryInto;

#[derive(Debug, Default)]
pub(crate) struct Popularity {
    inner: HashMap<String, usize>,
}

#[derive(Debug, Default)]
pub(crate) struct Pool {
    inner: HashMap<String, u16>,
}

impl Popularity {
    pub fn vote(&mut self, string: &str) {
        self.inner
            // FIXME avoid copy
            .entry(string.to_owned())
            .and_modify(|x| *x += 1)
            .or_insert(1);
    }

    pub fn report(mut self) -> Vec<String> {
        let mut result: Vec<_> = self.inner.drain().collect();
        result.sort_by(|(x, m), (y, n)| m.cmp(n).reverse().then_with(|| x.cmp(y)));

        // FIXME avoid collect
        result.drain(..).map(|(x, _)| x).collect()
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
