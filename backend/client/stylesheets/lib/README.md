Every css file in this project is automatically added to the application by meteor.
This automatic loading follows a set of rules:


From the meteor docs (https://guide.meteor.com/structure.html#load-order):

```
1. HTML template files are always loaded before everything else
2. Files beginning with main. are loaded last
3. Files inside any lib/ directory are loaded next
4. Files with deeper paths are loaded next
5. Files are then loaded in alphabetical order of the entire path
```

As stated in 3., files inside a lib/ directory are loaded before "normal" files. We need
to make sure that reset.css is loaded before all other css, and thus we put it inside
a lib/ directory.

==> Do not move this file. :)
