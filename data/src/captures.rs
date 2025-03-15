use color_eyre::eyre::{self, OptionExt};
use regex::Captures;

pub(crate) trait CapturesExt {
    fn try_name(&self, name: &str) -> eyre::Result<&str>;
    fn name_or<'a>(&'a self, name: &str, default: &'a str) -> &'a str;
}

impl CapturesExt for Captures<'_> {
    fn try_name(&self, name: &str) -> eyre::Result<&str> {
        self.name(name)
            .ok_or_eyre("capture group doesn’t exist or didn’t participate")
            .map(|x| x.as_str())
    }

    fn name_or<'a>(&'a self, name: &str, default: &'a str) -> &'a str {
        self.try_name(name).unwrap_or(default)
    }
}
