# https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault
# terraform import azurerm_key_vault.main /subscriptions/27de852c-c023-4de6-ac4d-52c9d4470482/resourceGroups/teeledger-q-rg/providers/Microsoft.KeyVault/vaults/teeledger-q-kv
resource "azurerm_key_vault" "main" {
  name                = "${local.name_prefix}-kv"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku_name            = "standard"
  tenant_id           = data.azurerm_client_config.current.tenant_id
  enabled_for_deployment = true
}

# https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_access_policy.html
# terraform import azurerm_key_vault_access_policy.current_user_access_policy "/subscriptions/27de852c-c023-4de6-ac4d-52c9d4470482/resourceGroups/teeledger-q-rg/providers/Microsoft.KeyVault/vaults/teeledger-q-kv/objectId/c1604f75-afdb-4f5f-803c-7bf8f95bed46"
resource "azurerm_key_vault_access_policy" "current_user_access_policy" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id = data.azurerm_client_config.current.tenant_id
  object_id = data.azurerm_client_config.current.object_id

  key_permissions = [
    "Create",
    "Get",
    "List"
  ]

  secret_permissions = [
    "Set",
    "Get",
    "Delete",
    "Purge",
    "Recover",
    "List"
  ]
}

# https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_access_policy.html
# terraform import azurerm_key_vault_access_policy.server_container_app "/subscriptions/27de852c-c023-4de6-ac4d-52c9d4470482/resourceGroups/teeledger-q-rg/providers/Microsoft.KeyVault/vaults/teeledger-q-kv/objectId/46f68d1d-eef9-4368-8cb7-ec25f2179011"
resource "azurerm_key_vault_access_policy" "server_container_app" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_user_assigned_identity.app.principal_id

  secret_permissions = [
    "Get",
    "List",
  ]
}

# https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_secret.html
# terraform import azurerm_key_vault_secret.ghcr_pat "https://teeledger-q-kv.vault.azure.net/secrets/ghcr-pat/1c1e6e49b56742559c29c45dd8bd95ce"
resource "azurerm_key_vault_secret" "ghcr_pat" {
  name         = "ghcr-pat"
  value        = var.ghcr_pat
  key_vault_id = azurerm_key_vault.main.id
  depends_on = [
    azurerm_key_vault_access_policy.current_user_access_policy
  ]
}