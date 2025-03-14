use std::{collections::HashMap, fmt::{self, Formatter, Display}};

use nom::{IResult, character::complete::{satisfy, one_of, space1, space0, newline, multispace0}, sequence::{delimited, tuple, separated_pair}, bytes::complete::{tag, take_while1}, combinator::{map, opt, all_consuming}, multi::separated_list1, branch::alt, ParseTo};

use crate::details::GraphemeBreak;

pub(crate) fn generate_egcbreak() -> Result<String, failure::Error> {
    // UAX #29 revision 39, Table 1b + Table 1c
    // https://www.unicode.org/reports/tr29/tr29-39.html#Table_Combining_Char_Sequences_and_Grapheme_Clusters
    // (note the [CR LF], lowercase ri-sequence, and RI → Regional_Indicator)
    let (_, mut grammar) = Grammar::parse(r#"
        egc := CR LF | [CR LF] | Control | precore* core postcore*
        precore := Prepend
        core := hangul-syllable | ri-sequence | xpicto-sequence | [^Control CR LF]
        postcore := [Extend ZWJ SpacingMark]
        hangul-syllable := L* (V+ | LV V* | LVT) T* | L+ | T+
        ri-sequence := Regional_Indicator Regional_Indicator
        xpicto-sequence := \p{Extended_Pictographic} (Extend* ZWJ \p{Extended_Pictographic})*
    "#)?;

    grammar.expand();
    Ok(format!("{}", grammar))
}

#[derive(Debug, Clone)]
struct Grammar<'i>(Vec<Derivation<'i>>);
impl<'i> Grammar<'i> {
    fn parse(input: &'i str) -> IResult<&str, Self> {
        map(all_consuming(delimited(
            multispace0,
            separated_list1(newline, Derivation::parse),
            multispace0,
        )), Self)(input)
    }

    fn expand(&mut self) -> &Alternate<'i> {
        let mut nonterminals = HashMap::new();
        for Derivation((lhs, rhs)) in self.0.clone() {
            nonterminals.insert(lhs, rhs);
        }

        let Derivation((_, root)) = &mut self.0[0];
        root.expand(&nonterminals);

        root
    }
}
impl Display for Grammar<'_> {
    fn fmt(&self, f: &mut Formatter) -> fmt::Result {
        self.0[0].0.1.fmt(f)
    }
}

#[derive(Debug, Clone)]
struct Derivation<'i>((&'i str, Alternate<'i>));
impl<'i> Derivation<'i> {
    fn parse(input: &'i str) -> IResult<&str, Self> {
        map(separated_pair(
            delimited(space0, parse_nonterminal, space0),
            tag(":="),
            delimited(space0, Alternate::parse, space0),
        ), Self)(input)
    }
}

#[derive(Debug, Clone)]
struct Alternate<'i>(Vec<Sequence<'i>>);
impl<'i> Alternate<'i> {
    fn parse(input: &'i str) -> IResult<&str, Self> {
        map(separated_list1(tag("|"), delimited(space0, Sequence::parse, space0)), Self)(input)
    }
    fn expand(&mut self, nonterminals: &HashMap<&'i str, Alternate<'i>>) {
        for sequence in &mut self.0 {
            sequence.expand(nonterminals);
        }
    }
    fn fmt(&self, f: &mut Formatter) -> fmt::Result {
        let (first, rest) = self.0.split_first().unwrap();
        first.fmt(f)?;
        for x in rest {
            write!(f, "|")?;
            x.fmt(f)?;
        }
        Ok(())
    }
}

#[derive(Debug, Clone)]
struct Sequence<'i>(Vec<TermRepeat<'i>>);
impl<'i> Sequence<'i> {
    fn parse(input: &'i str) -> IResult<&str, Self> {
        map(separated_list1(space1, TermRepeat::parse), Self)(input)
    }
    fn expand(&mut self, nonterminals: &HashMap<&'i str, Alternate<'i>>) {
        for TermRepeat((term, _)) in &mut self.0 {
            term.expand(nonterminals);
        }
    }
    fn fmt(&self, f: &mut Formatter) -> fmt::Result {
        for x in &self.0 {
            x.fmt(f)?;
        };
        Ok(())
    }
}

#[derive(Debug, Clone)]
struct TermRepeat<'i>((Term<'i>, Repeat));
impl<'i> TermRepeat<'i> {
    fn parse(input: &'i str) -> IResult<&str, Self> {
        map(tuple((Term::parse, Repeat::parse)), Self)(input)
    }
    fn fmt(&self, f: &mut Formatter) -> fmt::Result {
        self.0.0.fmt(f)?;
        self.0.1.fmt(f)
    }
}

#[derive(Debug, Clone)]
enum Term<'i> {
    Nonterminal(&'i str),
    GcbValue(GcbValue),
    PropertyName(&'i str),
    GcbClass(bool, Vec<GcbValue>),
    Group(Alternate<'i>),
}
impl<'i> Term<'i> {
    fn parse(input: &'i str) -> IResult<&str, Self> {
        alt((
            map(parse_nonterminal, Self::Nonterminal),
            map(GcbValue::parse, Self::GcbValue),
            map(delimited(tag("\\p{"), parse_name, tag("}")), Self::PropertyName),
            map(delimited(tag("["), tuple((
                opt(tag("^")),
                separated_list1(space1, GcbValue::parse),
            )), tag("]")), |(not, gcbs)| Self::GcbClass(not.is_some(), gcbs)),
            map(delimited(tag("("), Alternate::parse, tag(")")), Self::Group),
        ))(input)
    }
    fn expand(&mut self, nonterminals: &HashMap<&'i str, Alternate<'i>>) {
        match self {
            Self::Nonterminal(k) => {
                let mut inner = nonterminals[k].clone();
                inner.expand(nonterminals);
                *self = Self::Group(inner);
            }
            Self::Group(alternate) => alternate.expand(nonterminals),
            _ => {},
        }
    }
    fn fmt(&self, f: &mut Formatter) -> fmt::Result {
        match self {
            Self::Nonterminal(_) => panic!(),
            Self::GcbValue(x) => {
                write!(f, "[")?;
                x.fmt(f)?;
                write!(f, "]")?;
            }
            Self::PropertyName("Extended_Pictographic") => {
                write!(f, "[\\x{:02X}-\\x{:02X}]", 0x80, 0xFF)?;
            }
            Self::PropertyName(_) => panic!(),
            Self::GcbClass(not, gcbs) => {
                let not = ["", "^"][*not as usize];
                write!(f, "[{}", not)?;
                for x in gcbs {
                    x.fmt(f)?;
                }
                write!(f, "]")?;
            }
            Self::Group(alternate) => {
                write!(f, "(?:")?;
                alternate.fmt(f)?;
                write!(f, ")")?;
            }
        };
        Ok(())
    }
}

#[derive(Debug, Clone)]
struct GcbValue(GraphemeBreak);
impl GcbValue {
    fn parse(input: &str) -> IResult<&str, Self> {
        map(map(parse_name, |x| x.parse_to().unwrap()), GcbValue)(input)
    }
    fn fmt(&self, f: &mut Formatter) -> fmt::Result {
        let x = self.0 as u8;
        assert!(x < 0x80);
        write!(f, "\\x{:02X}\\x{:02X}", x, x | 0x80)
    }
}

#[derive(Debug, Clone, Copy)]
enum Repeat {
    One,
    Star,
    Plus,
}
impl Repeat {
    fn parse(input: &str) -> IResult<&str, Self> {
        map(opt(one_of("*+")), |x| match x {
            None => Self::One,
            Some('*') => Self::Star,
            Some('+') => Self::Plus,
            _ => panic!(),
        })(input)
    }
    fn fmt(&self, f: &mut Formatter) -> fmt::Result {
        match self {
            Self::One => {}
            Self::Star => f.write_str("*")?,
            Self::Plus => f.write_str("+")?,
        };
        Ok(())
    }
}

fn parse_nonterminal(input: &str) -> IResult<&str, &str> {
    satisfy(|x| x.is_ascii_lowercase())(input)?;
    take_while1(|x: char| x == '-' || x.is_ascii_lowercase())(input)
}

fn parse_name(input: &str) -> IResult<&str, &str> {
    satisfy(|x| x.is_ascii_uppercase())(input)?;
    take_while1(|x: char| x == '_' || x.is_ascii_alphabetic())(input)
}
