use failure::{Error, Fail};
use regex::Captures;

#[derive(Fail, Debug)]
#[fail(display = "capture group doesn’t exist or didn’t participate")]
struct CapturesError;

pub(crate) trait CapturesExt {
    fn name_ok(&self, name: &str) -> Result<&str, Error>;
}

impl<'t> CapturesExt for Captures<'t> {
    fn name_ok(&self, name: &str) -> Result<&str, Error> {
        Ok(self.name(name).ok_or(CapturesError)?.into())
    }
}
