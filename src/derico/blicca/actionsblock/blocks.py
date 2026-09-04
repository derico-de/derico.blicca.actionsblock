"""The Actions block's identity, spelled once.

``actions`` is the block's ``@type``. Every surface that names the block
derives its own spelling from this constant: the serialization transformers
(``actions_transform``), the renderer view name
(``aurora-block-<ACTIONS_BLOCK_TYPE>``) and the registry record. Aurora ships
no block of that name, so registration (last-wins by weight) replaces nothing.
"""

ACTIONS_BLOCK_TYPE = "actions"
