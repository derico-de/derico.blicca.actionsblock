"""ActionsBlockView browser view.

Public renderer for the Aurora Actions block
"""
from Products.Five.browser import BrowserView


class ActionsBlockView(BrowserView):
    """Public renderer for the Aurora Actions block"""

    # If you need to override the template registered in configure.zcml:
    # index = ViewPageTemplateFile("actions_block_view.pt")

    def __call__(self):
        return self.index()
