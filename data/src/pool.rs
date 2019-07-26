use std::collections::HashMap;

#[derive(Debug, Default)]
pub(crate) struct Popularity {
    inner: HashMap<String, usize>,
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
