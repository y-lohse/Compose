# Compose
### A simple editor focused on content.

[Try out Compose for yourself](http://yannick-lohse.fr/Compose/).

## A real WYSIWYG editor

Compose has a very different approach than most other content editors. The general idea is that the writer needs to see his content in the exact same way readers will see it.

This makes Compose a "real" What You See Is What You Get editor — you're not seeing a preview or a simplified version while you're writing, it's the real deal.

The other important aspect is that creators need to focus on their content. Compose helps this by keeping tools out of the way until the writer needs them. Even better, it has built-in [Markdown](http://daringfireball.net/projects/markdown/basics) support so you don't even need the select-and-click tools most of the time.

## Features

- Natural formating. Start lists with hyphens, mark emphasis with * and _, etc.
- Pasting won't fuck eveything up. Pasted content is sanitized before it's inserted so data from other text editors will be clean.
- It's simple. Compose provides the most common formating tools out of the box — nothing more, nothing less.
- Typographic sweetness. Ellipses, proper dashes and quotes all built-in and automaticaly applied.

## Embedding Compose

### Technical stuff

Make sure jQuery is available, then add [compose.js](https://github.com/y-lohse/Compose/blob/master/compose.js) to your page. If you want the default styles for the tools, make sure you also load [compose.css](https://github.com/y-lohse/Compose/blob/master/compose.css).

Compose can be used on any regular DOM element (a `div` is probably the best choice). It's not meant to be used on `textarea` elements.

```js
//jquery style initialization
$('#your-container').Compose();

//not jquery
var composeInstance = new Compose('#your-container');
```

### Style

By design, Compose is **not** meant to be simply dumped on top of any existing project — but proper integration is simple enough. Aside from including the core js and css files, you will need to include css rules that will make the editor look like the actual content.

Say you want to use Compose to write blog posts. You'll probably already have some css ready to style posts.

```css
.blog-post h1{
  /*some rules*/
}
.blog-post p{
  /*some rules*/
}
/*more rules*/
```

All you need to do is include this css file, and make sure the Compose container gets those styles.

```html
<div id="compose-area" class="blog-post">
</div>
```

### Options

You can pass an additional `settings` parameter to both initilization functions above. `settings` should be a plain js object and supports the following values:

- `markdown': See the FAQ for more about this option.
- `tools': an array of tools that will be attached to this instance of Compose.
- `toolbarClass': CSS class for the toolbar. Default is 'compose-toolbar'.
- `toolClass': CSS class for the tools. Default is 'compose-tool'.
- `toolClassActive': CSS class for the tools when they have been used on the curently selected portion of text. Default is 'active'.

## Browser support & dependency

At this point, wide browser support is **not** a priority for Compose. It works in the latest (and not-so-latest) versions of Chrome & Firefox. It should work in Safari & Opera but this hasn't been tested yet. IE10 & above will be supported (currently works but slightly buggy), IE9 and below are not on the schedule for now.

Compose relies on jQuery for internal DOM manipulation. As it only uses a very small and stable subset of jQuery, any recent version should work.  
This dependency might be dropped at some point in the future but this is not a priority right now.

## FAQ

##### Can I add more tools to Compose?

Compose ships with the most usefull tools — titles, bold, italics, quotes, links and soon images. These should be enough for most use cases. Please note that providing a limited set of tool is again by design — drowning the users with options will not help them.

It is however possible to add custom tools and [Compose provides a lightweight API for this](https://github.com/y-lohse/Compose/wiki/Tools-API). The [core API](https://github.com/y-lohse/Compose/wiki/Core-API) may come in handy too.

##### Can I pick which tools are displayed? Can I reorder them?

Compose allows you to add and remove tools on the fly via the [addTool](https://github.com/y-lohse/Compose/wiki/Core-API#addtooltool) and [removeTool](https://github.com/y-lohse/Compose/wiki/Core-API#removetooltoolname) functions. The default tools are called *h1*, *h2*, *quote*, *emphasis*, *strong* and *link*. There's also an invisible tool called *PasteSanitize* that handdles pasting to the Compose editor.

There is no plan to add features like tool ordering or further control over the toolbar at this point. You can use css for more advanced styling of the toolbar & tools.

##### Can I change the way the toolbar looks?

The css file that ships with Compose define how the tools look like. Feel free to re-style them at will. The toolbar and the individual tools have configurable class names so they can be targeted via css.

##### I don't want Markdown support / I only want partial Markdown support / What flavor of markdown does Compose use?

Let's state it upfront: it's a bad idea to turn off markdown completely. If you do so you'll need to provide tools for lists, code and maybe other types of content. The Markdown support also provides typographic suggar (proper quotes and similar things).

That being said, there are a number of things you can do to tweak the behavor of Markdown. First, you can turn it off completely by setting the `markdown` option to false.

Second, Compose uses [marked](https://github.com/chjj/marked/) to convert markdown to html (with Github Flavored Markdown). It's not very practical right now, but you can tweak it's behavior via the global marked object and via the ComposeMarkdown object. More on this soon.

Lastly, you can plug in a custom Markdown parser. Pass in a function for the `markdown`, it will get called at init time and receive the current compose instance as a parameter. After that, you're on your own.

##### My custom stylesheet doesn't use tag names but classes. Can I still use Compose?

Sure, but it might cause some issues. By default, both tools and markdown conversion only output regular html tags without attributes.

For the tools, you can tweak them to add custom class names to element. Compsoe migth provide an API for this in the future. Markdown however does not support attributes so you'll need to disable it, at least partly. Again, a solution for this might be designed in the future.