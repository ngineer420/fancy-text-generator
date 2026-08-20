"""Per-page copy for /kaomoji/ and /symbols/, one entry per URL.

The counterpart to `style_page_copy.py`, and it exists for the same reason. A
picker page is a filter box over a grid; sixteen of them built from one
template with the mood name substituted in is scaled thin content, and dumping
that onto a fifty-one-URL domain puts the site-wide quality signal at risk, not
just the new pages. So every page here is written to its own subject and each
one carries a fact that is only true of that page:

    shrug                  the backslash that Markdown and Slack eat
    love / hearts          text presentation versus emoji presentation
    table-flip             box drawing needs a monospaced destination
    animals                the IPA and Canadian syllabics letters doing the work
    arrows                 arrows do not mirror in right-to-left text
    brackets-and-borders   CJK brackets carry their own fullwidth spacing
    music                  ♪ is a BMP character, 𝄞 is not, and it shows
    check-and-cross        ✔ is a dingbat with an emoji default

Nothing here is interpolated across pages. If two entries could be produced by
substituting a noun into the same sentence, one of them is not written yet.

Keys per entry, matching style_page_copy.COPY so the builders read alike:

    title, description   <title> and <meta name=description>
    h1, tagline          the hero
    intro_heading        <h2> over the two intro paragraphs
    intro, second        the intro paragraphs
    faq                  [(question, answer), ...] — also emitted as FAQPage LD
    aka                  the "also searched as" line
    hint                 group pages only: a word that really does match
                         something in that group, shown in the filter box, so
                         the placeholder teaches the filter instead of being
                         the same sentence on sixteen pages
    hub_blurb            group pages only: their line on the parent hub
"""

# Page order. The builder writes hub pages plus one page per slug, and
# build_style_pages.py imports CHARACTER_URLS for the sitemap so there is still
# exactly one file writing sitemap.xml.
KAOMOJI_SLUGS = ["happy", "sad", "angry", "love", "shrug", "cute", "table-flip", "animals"]
SYMBOL_SLUGS = ["hearts", "stars", "arrows", "check-and-cross", "brackets-and-borders", "music"]

CHARACTER_URLS = (
    ["/kaomoji/"]
    + ["/kaomoji/%s/" % s for s in KAOMOJI_SLUGS]
    + ["/symbols/"]
    + ["/symbols/%s/" % s for s in SYMBOL_SLUGS]
)


COPY = {

# ---------------------------------------------------------------- kaomoji hub

"kaomoji": {
    "title": "Kaomoji: Japanese Text Emoticons to Copy and Paste",
    "description": "Every kaomoji on fontloom, grouped by mood — happy, sad, angry, love, shrug, cute, table flip and animals. Click one to drop it into the text box and style it.",
    "h1": "Kaomoji",
    "tagline": "Faces made of ordinary characters — click one to build it into your text",
    "intro_heading": "What a kaomoji is, and why it reads the right way up",
    "intro": "A kaomoji is a face assembled out of characters that already exist for other reasons: a katakana tsu for a smile, a Kannada letter for a stare, box-drawing pieces for a table. The Western emoticon :-) is read by tilting your head. A kaomoji is not — (◕‿◕) faces you already, which is why it can carry an expression a colon and a bracket cannot, and why the vocabulary grew to thousands of faces rather than a dozen.",
    "second": "The practical reason to reach for one in 2026 is that a kaomoji is text. It is not an image the receiving app has to have a font for, it does not become a coloured picture in one client and a black outline in another, and it goes through fields that strip emoji outright — a username, a commit message, a filename, a game chat box. What it costs is length: most of these run ten to twenty characters, which matters where you are counting against a limit.",
    "faq": [
        ("Do kaomoji work everywhere emoji do?",
         "Broadly yes, and in some places where emoji do not, because a kaomoji is made of ordinary text characters rather than pictographs. The exceptions run the other way: a few of these draw on Kannada, Canadian syllabics or Ainu katakana, and a device with a thin font set may show a box for one character in the middle of an otherwise fine face. Every entry on this site is rendered and checked before it ships, but that check speaks for the machine it ran on."),
        ("Why is my kaomoji suddenly wider than it looked here?",
         "Fullwidth characters. Many kaomoji use the fullwidth forms — ＾ ω ｀ ）— which are drawn to the width of a CJK character, roughly double a Latin letter. In a proportional font that is exactly what makes the face look balanced. In a monospaced field it can go the other way, since some terminals give a fullwidth character one cell instead of two and the face collapses."),
        ("How much of my character limit does one use?",
         "More than it looks. A face like (づ｡◕‿‿◕｡)づ is thirteen characters and none of them are typed by you. The counter above the text box on this site reports what a string costs, including where a character counts as two against a limit, which is the surprise that catches people out on a bio field."),
    ],
    "aka": ["kaomoji", "japanese emoticons", "text faces", "text emoticons copy paste", "emoticon symbols"],
},

"kaomoji/happy": {
    "hint": "cheer",
    "title": "Happy Kaomoji: Smiling Text Faces to Copy and Paste",
    "description": "Smiling, laughing and cheering kaomoji — (◕‿◕) (＾▽＾) ヽ(´▽`)/ and more, each one click away from the text box so you can style it and copy it.",
    "h1": "Happy Kaomoji",
    "tagline": "Smiles, grins and both arms in the air",
    "intro_heading": "How a smile is built out of characters",
    "intro": "Almost every happy kaomoji is the same three-part sentence: a mouth, two eyes, and optionally a pair of arms. The mouth carries the difference. ▽ is a wide-open laugh, ‿ is a closed contented curve, ω is a small animal-like mouth that reads as friendly rather than delighted, and ε is a pucker. Swap only that character and (＾▽＾) becomes (＾ω＾) — the same face, one register quieter.",
    "second": "The arms are the katakana ヽ ヾ ノ ﾉ, chosen because they already look like a raised limb. ヽ(´▽`)/ is a person mid-cheer; drop the arms and you have a face sitting still. That modularity is why this set is the largest of the eight moods here and why nobody had to design any of it: the pieces were in the character set already, doing unrelated jobs, and got read as body language.",
    "faq": [
        ("Which happy kaomoji is safest to use anywhere?",
         "(◕‿◕) and (＾▽＾). Both are built entirely from characters with very wide font coverage — geometric shapes, fullwidth punctuation and the arrow-like triangles — so they survive on a stripped-down Android build or an old Windows machine. The ones to be careful with are the flower faces like (❁´◡`❁), where the florette is a dingbat that a minimal font set can miss."),
        ("Can I put one in my username?",
         "Sometimes, and less often than you would hope. Discord and Steam accept most of these in a display name; Instagram and TikTok take them in a bio but validate the handle itself against a much smaller set; Facebook and LinkedIn reject them in a real-name field outright. A display name is the reliable home for one."),
        ("What is the ‿ character?",
         "U+203F, the undertie. It is a phonetics mark used to show two sounds run together, and it has nothing to do with faces — it just happens to be the exact shape of a closed, smiling mouth. Half the kaomoji vocabulary is that kind of borrowing."),
    ],
    "aka": ["happy kaomoji", "smiling text face", "japanese smiley text", "happy emoticon copy paste", "cheerful kaomoji"],
    "hub_blurb": "Smiles, grins and cheering arms — the largest of the eight sets.",
},

"kaomoji/sad": {
    "hint": "tears",
    "title": "Sad and Crying Kaomoji: Text Faces to Copy and Paste",
    "description": "Crying, sobbing and downcast kaomoji — (╥﹏╥) ಥ_ಥ (´；ω；`) and more. Click one to drop it into the text box, style it, and copy the result.",
    "h1": "Sad Kaomoji",
    "tagline": "Tears, sighs and looking at the floor",
    "intro_heading": "Two traditions of drawing a tear",
    "intro": "The sad set is the clearest place to see that text faces have two separate ancestries. (T_T) and (;_;) are Western in construction — the eye is a letter or a punctuation mark standing in for a streak of water, and the whole thing is ASCII. (╥﹏╥) and (´；ω；`) are Japanese: the eye is a box-drawing piece with an actual vertical stroke through it, the mouth is a wavy dash from CJK punctuation, and the semicolon is doing duty as sweat or a tear rather than as punctuation.",
    "second": "ಥ_ಥ belongs to neither and is worth knowing about. ಥ is the Kannada letter TTHA, adopted wholesale by the internet because it looks like a weeping eye with the tear already attached. It carries real linguistic content for eighty million readers and none at all here, which is the trade every one of these borrowings makes.",
    "faq": [
        ("Why does ಥ_ಥ sometimes show as two empty boxes?",
         "Because Kannada is a script the device has no font for. It is not a broken character or a bad copy: the text is intact and the machine simply cannot draw it. Windows and macOS have shipped Kannada coverage for years and Android has it through Noto, so this is now rare, but a locked-down kiosk, an embedded browser or a game client with a custom font atlas will still show boxes. (╥﹏╥) is the safe substitute."),
        ("What is the difference between (T_T) and (╥﹏╥)?",
         "Width and tone. (T_T) is five ASCII characters, counts as five everywhere, and reads as deadpan or joking. (╥﹏╥) uses box-drawing and CJK punctuation, is visibly wetter, and reads as sincere. If you are being funny about a minor setback, the ASCII one is the better fit."),
        ("Is there a sad kaomoji short enough for a username field?",
         "ಥ_ಥ and (;_;) are three and five characters. Both fit almost anywhere a name field allows non-Latin characters at all, which the long parenthesised faces do not."),
    ],
    "aka": ["sad kaomoji", "crying text face", "sad emoticon copy paste", "japanese crying emoticon", "text face crying"],
    "hub_blurb": "Crying, sobbing and quietly glum — including ಥ_ಥ and the classic (T_T).",
},

"kaomoji/angry": {
    "hint": "glare",
    "title": "Angry Kaomoji: Rage and Disapproval Text Faces",
    "description": "Angry kaomoji to copy and paste — ಠ_ಠ ಠ益ಠ (╬ Ò﹏Ó) (¬_¬) and more. Click one to drop it into the text box and style the whole line.",
    "h1": "Angry Kaomoji",
    "tagline": "Disapproval, rage and the vein on the forehead",
    "intro_heading": "The anger marks, and where they came from",
    "intro": "Anger in kaomoji is signalled by two additions rather than by the face itself. The first is ╬ or ＃, sitting outside the parenthesis — that is the anger vein, a manga convention for a bulging forehead vessel drawn as a cross-hatch, and it is why (╬ Ò﹏Ó) reads as furious while ( Ò﹏Ó ) reads as merely upset. The second is the eyebrow: ` and ´ pressed against the eyes, as in (・`ω´・), which turns a neutral animal face into a scowl.",
    "second": "ಠ_ಠ deserves its own paragraph. The look of disapproval is one of the few kaomoji with a datable origin — it spread from Something Awful and Reddit in the late 2000s and became the internet's standard way to say nothing at all, disapprovingly. ಠ is the Kannada letter TTHA; ಠ益ಠ raises the temperature by putting the CJK character 益, meaning benefit or profit, between the eyes as a gritted mouth.",
    "faq": [
        ("What does 凸 mean in a kaomoji?",
         "It is a rude gesture. 凸 is a CJK ideograph meaning convex or protruding, and in 凸(￣ヘ￣) it is read as a hand with the middle finger raised. Worth knowing before you put it in a work channel, where it looks like a harmless little shape."),
        ("Why do some angry faces use ` and ´ instead of eyebrows?",
         "Because the grave and acute accents are the only characters in easy reach that slant. A slanted line above an eye is a lowered brow in every visual language, so (・`ω´・) reads as a scowl without needing a character that means anything of the sort. It is the same borrowing that gave the set its tears and its arms."),
        ("Is ಠ_ಠ still understood?",
         "Yes, and it has outlasted almost everything else from its era. It is the one kaomoji that reliably reads the same way to people who have never heard the word kaomoji, which makes it the safest angry face to use with an audience that is not already fluent."),
    ],
    "aka": ["angry kaomoji", "look of disapproval", "ಠ_ಠ", "angry text face", "rage emoticon copy paste"],
    "hub_blurb": "Glares, shouting and the anger vein — home of ಠ_ಠ and ಠ益ಠ.",
},

"kaomoji/love": {
    "hint": "kiss",
    "title": "Love Kaomoji: Heart Eyes and Kissing Text Faces",
    "description": "Love kaomoji to copy and paste — (♥ω♥) (｡♥‿♥｡) (˘⌣˘)♡ and more, with a note on why the heart sometimes turns red on its own.",
    "h1": "Love Kaomoji",
    "tagline": "Heart eyes, kisses and blushing",
    "intro_heading": "Why the heart in your kaomoji sometimes turns red",
    "intro": "This is the one mood with a rendering trap in it, and it is worth understanding before you paste a face into a bio. Unicode gives many characters a default presentation: text, meaning draw it in the current colour like a letter, or emoji, meaning draw it as a colour picture. ♡ U+2661 and ♥ U+2665 default to text, so (♥ω♥) stays the colour of the surrounding words. ❤ U+2764 defaults to emoji, so (◍•ᴗ•◍)❤ can arrive with a full-colour red heart pasted into the middle of a monochrome face.",
    "second": "Neither is broken and neither is under your control at the destination — it is decided by the receiving app's font stack, not by what you copied. If you want the heart to stay the colour of your text, pick a face built from ♡ or ♥. If you want the coloured one, ❤ is the character that gets it. The set below deliberately contains both, so you can choose rather than discover.",
    "faq": [
        ("How do I force the heart to stay black and white?",
         "Append U+FE0E, the text variation selector, immediately after the heart. It is an invisible character that requests text presentation. Support is inconsistent — many apps honour it, some ignore it, and a few show it as a stray box — so choosing ♥ over ❤ in the first place is the more reliable fix."),
        ("Why does ♥ look different on my phone than on my laptop?",
         "Because it is being drawn from a different font. A heart is one of the characters that appears in several fonts on a typical device, and which one wins depends on the app's font stack. Same text, same code point, different drawing — nothing has been lost in the copy."),
        ("Which love kaomoji works best in a bio?",
         "(｡♥‿♥｡) and (˘⌣˘)♡ both hold up well: they are short enough not to eat a limit, they read clearly at small sizes, and their hearts are the text-presentation kind so they inherit whatever colour the bio uses."),
    ],
    "aka": ["love kaomoji", "heart eyes text face", "kissing emoticon", "cute love emoticon copy paste", "heart kaomoji"],
    "hub_blurb": "Heart eyes, kisses and blushing — plus which hearts stay monochrome.",
},

"kaomoji/shrug": {
    "hint": "lenny",
    "title": "Shrug Emoticon ¯\\_(ツ)_/¯ — Copy, Paste and Keep the Backslash",
    "description": "The shrug emoticon and its variants, copied correctly. Why ¯\\_(ツ)_/¯ loses its backslash in Slack, Markdown and Discord, and how to stop it.",
    "h1": "Shrug Emoticon",
    "tagline": "¯\\_(ツ)_/¯ — and how to paste it without losing an arm",
    "intro_heading": "The backslash is the whole problem",
    "intro": "The shrug is the most-copied text face in existence and the one most often pasted wrong, because it contains a backslash and a great many text boxes treat a backslash as an instruction rather than as a character. Markdown, Slack, Discord and Reddit's comment editor all use a backslash to escape the character that follows it. The underscore after the backslash is exactly such a character. So you paste ¯\\_(ツ)_/¯, the editor consumes the backslash to escape the underscore, and what posts is ¯_(ツ)_/¯ — a shrug with one arm, which looks close enough to right that people do not notice for years.",
    "second": "The fix is to type a second backslash, ¯\\\\_(ツ)_/¯, in any field that does Markdown. It looks wrong in the box and comes out right in the message. In a field that does not process Markdown — a browser search bar, a spreadsheet cell, a game chat, a plain text file — paste it exactly as it is here and doubling the backslash will break it instead. There is no version that is correct in both, which is why this page keeps the honest one.",
    "faq": [
        ("What is ツ?",
         "The katakana character TSU, U+30C4. It has no facial meaning in Japanese at all — it is one syllable of a writing system, and it was adopted for the shrug purely because the two short strokes over a curve read as eyes over a smirk. Say it out loud and it is closer to 'tsu' than to anything expressive."),
        ("Why do the arms use a macron?",
         "¯ is U+00AF, the macron, a diacritic that ordinarily sits over a vowel to mark length. Used alone at the outside of the face it reads as an upturned palm. The underscores are the arms and the slash and backslash are the shoulders — it is a stick figure, drawn with five characters that were each designed for something else entirely."),
        ("Is there a shrug that survives Markdown as-is?",
         "Only by giving up the backslash. ╮(╯▽╰)╭ and ʅ(´◔౪◔)ʃ are both shrugging figures with no escape characters anywhere in them, so they paste identically into every field. If the classic is what you want, doubling the backslash in Markdown fields is the answer."),
    ],
    "aka": ["shrug emoticon", "¯\\_(ツ)_/¯", "shrug text copy paste", "i dont know emoticon", "shruggie"],
    "hub_blurb": "The classic ¯\\_(ツ)_/¯ and its relatives, with the backslash intact.",
},

"kaomoji/cute": {
    "hint": "bunny",
    "title": "Cute Kaomoji: Soft Text Faces to Copy and Paste",
    "description": "Cute kaomoji — (｡･ω･｡) (◍•ᴗ•◍) (づ｡◕‿‿◕｡)づ and more soft, round text faces. Click one to insert it into the text box and style the line.",
    "h1": "Cute Kaomoji",
    "tagline": "Round, soft and small enough to fit in a bio",
    "intro_heading": "Cuteness is made of small punctuation",
    "intro": "What separates a cute kaomoji from a merely happy one is almost always the halfwidth CJK punctuation: ｡ and ･, the small circle and middle dot from the katakana block. (◕‿◕) is a face. (｡◕‿◕｡) is a face with cheeks, and it took two characters that exist to end sentences and separate words in Japanese. The same trick gives (｡･ω･｡) its blush and gives the set its name — small marks, close in, reading as roundness.",
    "second": "The other half is the mouth. ᴗ ᵕ ᴥ ᗜ are all phonetic characters, drawn small and soft by design because they are meant to sit inside a line of linguistic notation rather than shout. Borrowed into a face they are the difference between a grin and a shy little smile. Nothing in this set is louder than it has to be, which is also why these are the kaomoji that survive best at bio-sized text.",
    "faq": [
        ("Why do some cute kaomoji look cramped in my app?",
         "Because ｡ and ･ are halfwidth forms — they are drawn narrower than the fullwidth ｡ and ・ they correspond to. An app substituting a font that has only the fullwidth versions will render the face wider and looser than it looks here. It is still the same text; nothing was lost."),
        ("Which of these fit in a short bio?",
         "(◍•ᴗ•◍), (｡･ω･｡) and (๑˘︶˘๑) are all seven to nine characters, which leaves room for actual words. (づ｡◕‿‿◕｡)づ is thirteen and is better used on its own line than tucked into a sentence."),
        ("What is ᴥ?",
         "U+1D25, the Latin letter AIN, a phonetic symbol. Two dots and a curve — an animal snout, if you are looking for one, which is why it is the standard nose across the whole animal set and turns up here in the softer faces too."),
    ],
    "aka": ["cute kaomoji", "soft text face", "kawaii emoticon copy paste", "cute japanese emoticon", "uwu text face"],
    "hub_blurb": "Small, round and soft — the ones that fit inside a bio.",
},

"kaomoji/table-flip": {
    "hint": "unflip",
    "title": "Table Flip Text: (╯°□°）╯︵ ┻━┻ Copy and Paste",
    "description": "The table flip emoticon and the one that puts it back — (╯°□°）╯︵ ┻━┻ and ┬─┬ ノ( ゜-゜ノ). Copy either, or insert it into the text box and style it.",
    "h1": "Table Flip",
    "tagline": "(╯°□°）╯︵ ┻━┻ — and the one that puts it back",
    "intro_heading": "The table is drawn with box-drawing characters",
    "intro": "┻━┻ is not a picture of a table; it is three box-drawing characters from U+2500, the block of line pieces built in the 1980s so that text terminals could draw frames, borders and forms. ┻ is 'up and horizontal', ━ is 'heavy horizontal'. Stood next to each other they happen to look exactly like a table seen from the side, and ┬─┬ — 'down and horizontal' with a light horizontal — is the same table the right way up.",
    "second": "That origin is also the one thing that can go wrong. Box-drawing characters were designed for a grid where every cell is the same width, and they are drawn to touch their neighbours edge to edge so that lines join up. In a proportional font — most of the web, most chat apps — the pieces are spaced apart and the tabletop can arrive with visible gaps in it. In a monospaced destination, a terminal, a code block, a spreadsheet with a fixed-width font, it joins perfectly. If your flip looks broken, that is the reason, and wrapping it in a code block fixes it.",
    "faq": [
        ("What is the one that puts the table back?",
         "┬─┬ ノ( ゜-゜ノ). The flipped table ┻━┻ is turned upright to ┬─┬, the arms come down, and the face goes deadpan. It is traditionally posted as a reply to someone else's flip, which is most of the joke."),
        ("Why is ︵ used for the flying table?",
         "It is U+FE35, a presentation form of a parenthesis rotated for vertical Japanese text. Rotated ninety degrees it is an arc, which reads as the trajectory of something thrown. The whole family of vertical forms — ︵ ︶ ﹏ ︿ — gets used this way in kaomoji for arcs, mouths and eyebrows."),
        ("Does the table flip work on Discord and Slack?",
         "Yes, and both look better than average because both render chat in a font with good box-drawing coverage. Slack even has a /shrug command; there is no /tableflip built in, but pasting works. Watch for the closing ）in (╯°□°）╯ — it is the fullwidth parenthesis, deliberately, and replacing it with an ASCII one visibly narrows the face."),
    ],
    "aka": ["table flip", "(╯°□°）╯︵ ┻━┻", "flip table emoticon", "table flip text copy paste", "unflip table"],
    "hub_blurb": "┻━┻ in every register, plus the ┬─┬ that puts it back.",
},

"kaomoji/animals": {
    "hint": "bear",
    "title": "Animal Kaomoji: Bear, Cat and Bunny Text Faces",
    "description": "Animal kaomoji to copy and paste — ʕ•ᴥ•ʔ (=^･ω･^=) (ᐢ｡•༝•｡ᐢ) and more bears, cats, dogs and rabbits made of plain characters.",
    "h1": "Animal Kaomoji",
    "tagline": "Bears, cats, bunnies and one very good dog",
    "intro_heading": "Three alphabets doing the work of a zoo",
    "intro": "The animal faces lean on three scripts nobody expects. The bear ʕ•ᴥ•ʔ is bracketed by ʕ and ʔ, the IPA letters for a voiced and a voiceless pharyngeal — round, ear-shaped, and used here purely for their outline. The nose ᴥ is a phonetic Latin AIN. And the rabbit (ᐢ｡•༝•｡ᐢ) gets its ears from ᐢ, a Canadian Aboriginal syllabics character that represents a final N in Cree and Inuktitut.",
    "second": "The cats are the most varied, because a cat can be built at least four ways: (=^･ω･^=) frames the face with equals signs for whiskers, /ᐠ｡ꞈ｡ᐟ\\ uses syllabics for pointed ears, ᓚᘏᗢ draws a whole cat lying down from three syllabics characters and no face at all, and ≽^•⩊•^≼ is the recent one that spread through social media without ever acquiring a name. All four are ordinary text and all four paste anywhere.",
    "faq": [
        ("Why do some animal faces show boxes on my device?",
         "Canadian Aboriginal syllabics is the usual culprit. ᐢ ᐠ ᐟ ᓚ ᘏ ᗢ come from a script with far narrower font coverage than Latin or CJK — macOS and Windows both ship it, Android covers it through Noto, but a game client or an embedded browser with a cut-down font may not. The bear ʕ•ᴥ•ʔ and the cat (=^･ω･^=) use only IPA and katakana and are the safest of the set."),
        ("What is ᓚᘏᗢ?",
         "A cat lying down, seen from the side, drawn with three Canadian syllabics characters: ᓚ is the tail curl, ᘏ the ears, ᗢ the body. It is the most efficient animal here — three characters for a whole cat — and the least likely to render on an unusual device, which is the trade."),
        ("Can I use these in a game or a nickname field?",
         "More often than most kaomoji, because several are short and use no parentheses. ʕ•ᴥ•ʔ is five characters, ᓚᘏᗢ is three, and both go through name fields that reject the longer parenthesised faces. Check how it looks in the game itself first — game clients bake their own font atlases and are the single most common place these show as boxes."),
    ],
    "aka": ["animal kaomoji", "bear text face", "cat emoticon copy paste", "bunny kaomoji", "ʕ•ᴥ•ʔ"],
    "hub_blurb": "Bears, cats, rabbits and dogs, built from IPA and syllabics.",
},

# ---------------------------------------------------------------- symbols hub

"symbols": {
    "title": "Text Symbols to Copy and Paste: Hearts, Stars, Arrows, Checks",
    "description": "Copy-and-paste text symbols grouped by what they are for — hearts, stars, arrows, check marks, brackets and borders, music. Click one to insert it into the text box.",
    "h1": "Text Symbols",
    "tagline": "Single characters, sorted by the job they do",
    "intro_heading": "A text symbol is not a small emoji",
    "intro": "The difference matters more than it sounds. ★ and ⭐ are both stars and they behave nothing alike. ★ U+2605 has text presentation by default: it is drawn from the current font, in the current colour, at the current weight, and it inherits your styling like a letter does. ⭐ U+2B50 has emoji presentation by default: the system swaps in a colour picture from the emoji font, at its own size, ignoring your colour entirely.",
    "second": "So the choice is not decorative. A text symbol in a heading takes the heading's colour and scales with it; an emoji sits in it like a sticker. A text symbol pastes into a field that strips emoji; an emoji does not. And a text symbol costs one character against a limit where many emoji cost two or more. Each page below says which of its symbols fall on which side of that line, because it is invisible until you paste.",
    "faq": [
        ("Why does a symbol I copied change colour when I paste it?",
         "It has emoji presentation, and the destination has an emoji font. Nothing was altered in the copy — the same code point arrived, and the receiving app chose to draw it from a colour font. If you want it to stay monochrome, use the text-presentation character from the same page: ♥ instead of ❤, ★ instead of ⭐, ✔ instead of ✅."),
        ("Do these count as one character?",
         "Most do. The ones from the Basic Multilingual Plane — hearts, stars, arrows, box drawing — are a single UTF-16 unit and count as one everywhere. Emoji symbols are usually two, and a few, like the mending heart, are four or more because they are several code points joined together. The counter above the text box reports the real number for whatever you build."),
        ("Where do these actually work?",
         "Anywhere plain text goes: bios, spreadsheet headers, commit messages, chat, filenames, alt text. The failure mode is not usually the destination but the reader — a screen reader announces ★ as 'black star' in the middle of your sentence, so use them as marks and ornaments rather than as words."),
    ],
    "aka": ["text symbols", "symbols copy and paste", "cool symbols", "special characters copy paste", "unicode symbols"],
},

"symbols/hearts": {
    "hint": "broken",
    "title": "Heart Symbols to Copy and Paste: ♥ ♡ ❤ and More",
    "description": "Every heart symbol worth copying — ♥ ♡ ❤ ❥ ❣ ღ plus the coloured emoji hearts, with a note on which ones stay the colour of your text.",
    "h1": "Heart Symbols",
    "tagline": "♥ ♡ ❤ — and which of them stay monochrome",
    "intro_heading": "Two families of heart, and how to tell them apart",
    "intro": "There are two hearts in Unicode with almost the same drawing and completely different behaviour. ♥ U+2665 is a playing-card suit. It has text presentation, so it takes the colour, weight and size of the text around it — put it in a grey caption and it is grey. ❤ U+2764 is a dingbat with emoji presentation, so on nearly every modern device it is replaced by a red picture from the emoji font regardless of what colour your text is.",
    "second": "That is the single decision to make on this page. For a bio, a heading, a spreadsheet or anywhere the heart should match the words around it, use ♥ or the hollow ♡ U+2661. For a message where you want the familiar red one, ❤ is what gets it. Everything below the text hearts here is explicitly emoji and will always arrive in colour, which is sometimes exactly what you want — 💔 is a picture and there is no monochrome equivalent to reach for.",
    "faq": [
        ("How do I make ❤ black instead of red?",
         "In most apps you cannot, because the substitution happens in the receiving font stack, not in the text. Appending U+FE0E, the text variation selector, requests the monochrome form and is honoured by some apps and ignored by others. Using ♥ from the start is the reliable answer."),
        ("What is ღ?",
         "The Georgian letter HAN, U+10E3. It is a real letter of a real alphabet that happens to be shaped like a small looping heart, and it spread as a heart substitute because it is compact, has text presentation, and survives in fields that filter symbol characters. It reads as a letter to a screen reader and to anyone who reads Georgian."),
        ("Which heart is best for a username?",
         "♡ or ღ. Both are single BMP characters, both count as one against a length limit, and neither triggers the emoji filters that some platforms apply to name fields. ❤ and the coloured hearts are two characters each and are rejected far more often."),
    ],
    "aka": ["heart symbol", "heart text symbol copy paste", "♥ copy", "love symbols", "heart emoji text"],
    "hub_blurb": "♥ ♡ ❤ ღ and the coloured ones, sorted by which stay monochrome.",
},

"symbols/stars": {
    "hint": "sparkle",
    "title": "Star Symbols to Copy and Paste: ★ ☆ ✦ ✧ and Sparkles",
    "description": "Star and sparkle symbols — ★ ☆ ✦ ✧ ✩ ✵ ❄ ✿ and more, including the ones that build a rating row and the ones that arrive as coloured emoji.",
    "h1": "Star Symbols",
    "tagline": "★ ☆ ✦ ✧ — filled, hollow, four-pointed and sparkling",
    "intro_heading": "The pair that makes a rating row",
    "intro": "★ U+2605 and ☆ U+2606 are the most useful two characters on this page, because they were designed as a matched pair: same size, same optical weight, one filled and one hollow. That is what lets ★★★☆☆ read instantly as three out of five, in a spreadsheet cell, a commit message or a plain-text review, with no image and no markup. Nothing else in the star family pairs that cleanly — the dingbat stars ✦ ✧ ✩ ✪ vary in size and stroke weight from one to the next.",
    "second": "The rest of the page is ornament, and most of it comes from the Dingbats block that Zapf designed for the Zapf Dingbats typeface in 1978. That is why ✱ ✲ ✳ ✴ ✵ ✶ ✷ ✸ run in an orderly sequence of point counts, and why the florettes ✿ ❀ ❁ sit in the same block as the stars: they were adjacent keys on one typographic keyboard long before they were code points. ⭐ ✨ 💫 are the modern emoji additions and always arrive in colour.",
    "faq": [
        ("Why does ★ look different in different apps?",
         "It is a text-presentation character, so it is drawn by whatever font the app resolved for it — and stars appear in several fonts on a typical device. Weight, point sharpness and vertical alignment all shift between them. That is normal and the text is unchanged; if you need it identical everywhere, no plain-text symbol can promise that."),
        ("How do I build a half-star rating?",
         "There is no half-star in wide use with reliable coverage. The usual answer in plain text is to use ★★★☆☆ and put the fraction in words, or to use the shade blocks ░ ▒ ▓ from the brackets and borders page to build a bar instead, which gives you finer resolution and better font coverage."),
        ("What is the difference between ✨ and ✧?",
         "✨ is an emoji: it arrives in colour, at the emoji font's size, and costs two characters. ✧ is a text dingbat: it takes your text colour, scales with your type, and costs one. For decorating a bio around your own words, ✧ blends; ✨ interrupts."),
    ],
    "aka": ["star symbol", "star text symbol copy paste", "★ copy", "sparkle symbol", "rating stars text"],
    "hub_blurb": "★ ☆ for ratings, plus the dingbat stars, florettes and sparkles.",
},

"symbols/arrows": {
    "hint": "chevron",
    "title": "Arrow Symbols to Copy and Paste: → ← ↑ ↓ ⇒ ➜ and More",
    "description": "Arrow symbols in every direction and weight — → ← ↑ ↓ ↔ ⇒ ➔ ➜ ➤ » ‹ — with a note on what happens to them in right-to-left text.",
    "h1": "Arrow Symbols",
    "tagline": "→ ← ↑ ↓ ⇒ ➜ — every direction, in three weights",
    "intro_heading": "Light, double and heavy, and why there are three",
    "intro": "The arrows come from two blocks that were added for different reasons and that is what you are choosing between. U+2190 Arrows is a mathematical and technical block: → ← ↑ ↓ ↔ are light, thin-stroked, and sized to sit inside a line of type without shouting, which is why → is the right arrow for 'a → b' in a sentence. ⇒ is not a heavier version of it — in mathematics it means 'implies', and it is drawn double for that reason.",
    "second": "The Dingbats block is the other source, and it is where the display arrows live: ➔ ➜ ➙ ➝ ➞ ➤ are drawn heavy, at display weight, designed for a signpost rather than a sentence. If an arrow in your heading is disappearing, that is the swap to make. ➡ is different again — it has emoji presentation and will arrive as a coloured picture, which is almost never what a heading wants.",
    "faq": [
        ("Do arrows flip in right-to-left text?",
         "No, and this catches people out. The bidirectional algorithm reorders the characters of a line for Arabic or Hebrew, but → is not a mirroring character: it keeps pointing right even though the text now runs the other way, so an arrow meaning 'next' becomes an arrow pointing backwards. If the direction is meaningful in an RTL context, choose the arrow by absolute direction rather than by 'forward'."),
        ("Which arrow should I use in a breadcrumb?",
         "› U+203A or » U+00BB. Both are angle quotation marks rather than arrows, both are narrow, both have excellent font coverage going back decades, and both read as separators rather than as instructions. → in a breadcrumb reads as a transformation, which is why the convention settled on the chevrons."),
        ("Why is ➡ coloured when → is not?",
         "➡ U+27A1 is one of the dingbats Unicode gave emoji presentation when the emoji set was unified in 2010, so a modern device draws it from the colour font. → U+2192 was never in that set and stays text. Same shape, opposite behaviour."),
    ],
    "aka": ["arrow symbol", "arrow copy paste", "→ symbol", "arrow text symbol", "right arrow copy"],
    "hub_blurb": "Every direction in three weights, from thin → to heavy ➜.",
},

"symbols/check-and-cross": {
    "hint": "checkbox",
    "title": "Check Mark and Cross Symbols to Copy and Paste: ✓ ✔ ✗ ✘",
    "description": "Check marks, crosses, boxes and bullets to copy and paste — ✓ ✔ ✅ ☑ ✗ ✘ ❌ ☐ • ⚠ — for plain-text checklists that survive anywhere.",
    "h1": "Check Marks & Crosses",
    "tagline": "✓ ✔ ✗ ✘ ☐ ☑ — everything a plain-text checklist needs",
    "intro_heading": "Building a checklist that survives being pasted",
    "intro": "The reason this set is worth having in plain text is that a checklist made of these characters goes anywhere: a spreadsheet column, a commit message, a chat, an issue body, a filename. There is no markup to strip and nothing to render. ☐ U+2610 and ☑ U+2611 are a designed pair — the empty and ticked ballot boxes, same size, same weight — and a column of them reads as a to-do list without a single formatting feature being involved.",
    "second": "The trap is that the popular tick is not the plain one. ✔ U+2714 is a dingbat that Unicode gave emoji presentation, so on many devices it arrives as a coloured picture rather than as a mark in your text colour. ✓ U+2713 is its text-presentation sibling and is the one to use inside a sentence or a table. ✅ and ❌ are unambiguously emoji and always arrive in colour, which is the right choice for a status line and the wrong one for a document.",
    "faq": [
        ("Why did my ✔ turn green?",
         "It has emoji presentation and the destination substituted its emoji font, which draws U+2714 as a green tick. Use ✓ U+2713 instead: same mark, text presentation, inherits your colour. This is also why a checklist can look consistent in your editor and mismatched once posted."),
        ("What is the difference between ✗ and ✘ and ✕?",
         "Weight and intent. ✗ U+2717 is a ballot X, drawn to pair with the ballot tick ✓. ✘ U+2718 is its heavy version. ✕ U+2715 is a multiplication X — geometrically symmetrical, which is why interfaces use it for a close button rather than for a wrong answer. For a checklist, ✗ pairs correctly with ✓."),
        ("Can I use ☐ and ☑ in a spreadsheet?",
         "Yes, and it is one of the better uses for them: they are single characters, sort predictably, and are searchable with find and replace. What they are not is interactive — flipping one means editing the cell. If you need a real toggle, the spreadsheet's own checkbox feature is a different thing that happens to look similar."),
    ],
    "aka": ["check mark symbol", "checkmark copy paste", "✓ copy", "cross symbol", "tick symbol text"],
    "hub_blurb": "Ticks, crosses, boxes and bullets for plain-text checklists.",
},

"symbols/brackets-and-borders": {
    "hint": "corner",
    "title": "Bracket and Border Symbols: 「」【】 ┌─┐ ░▒▓ Copy and Paste",
    "description": "Decorative brackets and box-drawing borders — 「」『』【】〔〕 plus ┌ ─ ┐ ╔ ═ ╗ and the shade blocks ░ ▒ ▓ for building frames in plain text.",
    "h1": "Brackets & Borders",
    "tagline": "「」【】 ┌─┐ ░▒▓ — frames that are made of text",
    "intro_heading": "Two toolkits: CJK brackets and box drawing",
    "intro": "The brackets here are the CJK ones — 「」『』【】〔〕《》— and they are fullwidth characters, drawn on a square em body twice the width of a Latin letter with their own padding designed in. That is why 【like this】 looks deliberately spaced without you adding a single space, and why it reads as a heading marker in a plain-text field. It is also why mixing them with ASCII brackets in one line looks uneven: you are combining two different metric systems.",
    "second": "The borders are the box-drawing block, U+2500, built so 1980s text terminals could draw frames. Every piece is designed to touch its neighbours edge to edge, so ┌───┐ joins into a continuous line — but only where every cell is the same width. In a proportional font the pieces drift apart and the frame develops gaps. Box drawing belongs in monospaced destinations: terminals, code blocks, README files, fixed-width spreadsheet columns. The shade blocks ░ ▒ ▓ █ come from the same era and are still the best way to draw a progress bar in text.",
    "faq": [
        ("Why does my ASCII-art box have gaps in it?",
         "Because the destination is using a proportional font. Box-drawing characters assume every character occupies an identical cell, which is true in a terminal and false in a chat app or a bio. Wrapping the block in a code fence, where one exists, switches the renderer to a monospaced font and the joins close up."),
        ("Should I use 【】 or ASCII brackets for a title?",
         "【】 if the field is plain text and you want visible emphasis — they are wide, dark and unmistakable, which is why Chinese and Japanese sites use them as headline markers. ASCII brackets if the text will be parsed by anything, since some systems treat fullwidth punctuation as a separate character class when searching or sorting."),
        ("Do the fullwidth brackets need spaces around them?",
         "No, and adding them usually looks wrong. The fullwidth forms carry their own side bearings — the whitespace is drawn into the character. 【 title 】 reads as too loose; 【title】 is the intended spacing."),
    ],
    "aka": ["bracket symbols", "japanese brackets copy paste", "box drawing characters", "border symbols text", "「」copy"],
    "hub_blurb": "Fullwidth CJK brackets, box-drawing frames and the shade blocks.",
},

"symbols/music": {
    "hint": "volume",
    "title": "Music Note Symbols to Copy and Paste: ♪ ♫ ♬ ♩ and Playback",
    "description": "Music symbols to copy and paste — ♪ ♫ ♬ ♩ ♭ ♯ 𝄞 — plus the playback controls ▶ ⏸ ⏹ ⏭, with a note on which ones render everywhere.",
    "h1": "Music Symbols",
    "tagline": "♪ ♫ ♬ ♩ ♭ ♯ — plus the playback controls",
    "intro_heading": "Why ♪ works everywhere and 𝄞 sometimes does not",
    "intro": "♪ ♫ ♬ ♩ ♭ ♮ ♯ all live in the Miscellaneous Symbols block, U+2600, deep in the Basic Multilingual Plane, and they have been in fonts since the 1990s. They are single UTF-16 units, they count as one character, and they render essentially everywhere. That makes ♪ the safest ornament on this page and the one to reach for in a bio, a playlist name or a now-playing status.",
    "second": "𝄞 the treble clef is a different proposition. It lives at U+1D11E, in the Musical Symbols block on Plane 1, outside the BMP — which means it is two UTF-16 units, counts as two against most length limits, and depends on a font that many minimal installations skip. When it renders it is a genuinely beautiful character; when it does not, it is a box in the middle of your text. The playback controls ▶ ⏸ ⏹ ⏭ ⏮ are a third case again: they are in the BMP but were given emoji presentation, so they usually arrive as colour pictures.",
    "faq": [
        ("Which music symbol should I put in a username?",
         "♪ or ♫. One character each, universal coverage, no emoji substitution, and they are accepted by name fields that reject emoji outright. ♬ is equally safe and slightly busier at small sizes."),
        ("Why does ▶ look like a coloured triangle in one app and a black one in another?",
         "▶ U+25B6 is a geometric shape with emoji presentation as its default. An app with an emoji font draws the colour version; an app without one falls back to the geometric glyph in your text colour. If you need the black triangle reliably, ▸ or ► are geometric shapes that were never given an emoji default."),
        ("Can I write actual music with these?",
         "No, and the Musical Symbols block is honest about that — it encodes the pieces, not the layout. Real notation needs pitches placed on a stave, which is a two-dimensional arrangement that text cannot express. These characters are for referring to music, not for writing it."),
    ],
    "aka": ["music note symbol", "♪ copy paste", "musical notes text", "music symbols copy", "play button symbol"],
    "hub_blurb": "♪ ♫ ♬ for anywhere, 𝄞 for when the font allows, plus playback controls.",
},

}
