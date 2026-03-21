

# Broken Heading (extra blank lines above)



##Missing space after hash

###Also missing space

# Heading with trailing hash #

## Heading with multiple trailing hashes ###



This paragraph has way too many blank lines after it.




And this one too.




### Broken Lists

- Item one
- Item two

- Item three (extra blank line above breaks list continuity)
-Missing space after dash
* Mixed markers mid-list
+ Also plus signs
- Back to dashes
  -Missing space in nested item
  - Proper nested item
    -Triple nested missing space

### Code Fence Issues

```javascript
function hello() {
  console.log("this code block is fine");
}
```

```
Unclosed code fence without closing backticks

Some text that should be a paragraph but is inside the unclosed fence.

## This heading is trapped inside the code block

- This list too

``` javascript
Code fence with space before language (some parsers reject this)
```

~~~
Tilde code fence
~~~

``
Not a code fence (only 2 backticks)
``

### Bold and Italic Errors

** broken bold with spaces **
__ broken underscore bold with spaces __
* broken italic with spaces *
_ broken underscore italic with spaces _
~~ broken strikethrough with spaces ~~

**unclosed bold

*unclosed italic

~~unclosed strikethrough

**bold with
line break inside**

_italic with
line break inside_

### Link Errors

[broken link](
[another broken](https://example.com
[text]()
[]( https://example.com)
[](https://example.com)
(https://example.com)[reversed order]
[link with **bold** and `code`](https://example.com)

### Image Errors

![broken image](
![](no-protocol-image)
![]()

### Table Errors

| Missing | Separator |
| data1 | data2 |

| Header |
| --- |
| cell | extra cell |

|No|Spaces|Around|Pipes|
|---|---|---|---|
|a|b|c|d|

|| Empty first header || Another ||
| --- | --- | --- |
| cell | cell | cell |

### Blockquote Issues

>Missing space after >
> Proper blockquote
>
>Missing space in continuation
>> Nested but wrong depth style
> > Nested with space (different parsing)

### Mixed Indentation

- Item with spaces
	- Item with tab
  - Item with 2 spaces
    - Item with 4 spaces
	  - Item with tab + 2 spaces

1. Number list
	1. Tabbed sub
   1. 3-space sub
    1. 4-space sub

### Horizontal Rule Variants

---
***
___
- - -
* * *
_ _ _
--
**
__

### Escaped Characters Gone Wrong

\*not italic\*
\**not bold\**
\[not a link\](https://example.com)
\`not code\`

### HTML Mixed In

<div>Some HTML that should pass through</div>

<p>Paragraph in HTML</p>

<script>alert('xss')</script>

### Deeply Nested Nightmare

1. Level 1
   1. Level 2
      1. Level 3
         1. Level 4
            1. Level 5
               1. Level 6
                  - Switch to bullet at level 7
                    - Level 8
                      - Level 9 (most parsers give up here)

### Whitespace Chaos

Text with	tabs	in	the	middle.

Text with trailing spaces     
And continuation.

   Leading whitespace on this paragraph.

	Tab-indented paragraph (treated as code by some parsers).

### Missing Newlines Between Elements
# Heading immediately followed by
- a list without blank line
- second item
And then text without blank line
## Another heading without blank line
> And a blockquote without blank line
```
code fence without blank line
```
1. Ordered list without blank line
2. Second item
---
Text after hr without blank line.

### Empty Elements

#

##

-
*
1.

> 

```
```

||
| --- |
| |

### Consecutive Same Elements

# Heading 1
# Heading 2
# Heading 3

> Quote 1

> Quote 2

> Quote 3

---
---
---

### Unicode and Special Characters

Emojis: 🎉 🚀 ⚡ 🔥 ✅ ❌ ⚠️ 💡

CJK: 这是中文 これは日本語 이것은 한국어

RTL: مرحبا بالعالم

Math-like: α β γ δ ε × ÷ ≠ ≤ ≥ ∞

Symbols: © ® ™ § ¶ † ‡ • … « »

### Extremely Long Lines

This is an extremely long line that goes on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on.

| Column A with a very long header that exceeds normal width | Column B also very very very very long | Short |
| --- | --- | --- |
| Cell with extremely long content that goes on and on and on and on and on and on and on and on and on | Another long cell blah blah blah blah blah blah blah blah blah | ok |
