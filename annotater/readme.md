Annotater
===========

- This extension lets you annotate Jupyter notebook cells / code and store the annotations in an elastic search index.
- This adds two buttons to your Jupyter notebook toolbar: Annotate Cell and Annotate Selection
- Currently WIP, no elastic search configuration and cannot use secure elastic search yet.


Installation
------------

The extension requires jupyter_nbextensions to be installed. After, simply place the entire 'annotater' extension package into the 'jupyter_contrib_nbextensions/nbextensions' directory within the Jupyter site-packages directory. You can enable the annotater extension by selecting it in the 'nbextensions' tab on the Jupyter homepage.


Testing
-------

Use a code cell with

```python
%%javascript
require("base/js/utils").load_extensions("annotater/annotater")
```


Automatic load
--------------

You may also automatically load the extension for any notebook via

```bash
jupyter nbextension enable annotater/annotater
```

