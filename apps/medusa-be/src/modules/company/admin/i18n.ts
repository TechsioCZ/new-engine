export type CompanyAdminI18nNamespace = {
  actions: Record<
    | "add"
    | "cancel"
    | "createCompany"
    | "delete"
    | "edit"
    | "editCustomerDetails"
    | "editDetails"
    | "manageCustomerGroup"
    | "restore"
    | "save",
    string
  >
  approvalSettings: Record<
    | "adminApprovalDescription"
    | "adminApprovalLabel"
    | "badgeAdmin"
    | "badgeNone"
    | "badgeSalesManager"
    | "salesManagerApprovalDescription"
    | "salesManagerApprovalLabel"
    | "title",
    string
  >
  columns: Record<
    | "actions"
    | "address"
    | "approvalSettings"
    | "city"
    | "company"
    | "currency"
    | "customerGroup"
    | "email"
    | "employees"
    | "name"
    | "phone"
    | "spendingLimit"
    | "status"
    | "state",
    string
  >
  customerGroup: Record<
    | "add"
    | "empty"
    | "hint"
    | "linkedToCompanyTooltip"
    | "remove"
    | "set"
    | "title"
    | "titleFallback",
    string
  >
  employees: Record<
    | "adminBadge"
    | "adminDescription"
    | "adminLabel"
    | "adminTooltip"
    | "createTitle"
    | "details"
    | "editTitle"
    | "emptyMessage"
    | "emptyTitle"
    | "firstName"
    | "lastName"
    | "permissions"
    | "spendingLimitWithCurrency"
    | "title",
    string
  >
  errors: Record<
    | "companyNotFound"
    | "createCompanyFailed"
    | "createCustomerFailed"
    | "createEmployeeFailed"
    | "loadCustomerGroupsFailed"
    | "missingEmployeeDetails"
    | "removeCustomerGroupFailed"
    | "restoreCompanyFailed"
    | "saveErrorPrefix"
    | "saving"
    | "updateApprovalSettingsFailed"
    | "updateCompanyFailed"
    | "updateCustomerGroupFailed"
    | "updateEmployeeFailed",
    string
  >
  fields: Record<
    | "address"
    | "city"
    | "country"
    | "currency"
    | "email"
    | "logoUrl"
    | "name"
    | "phone"
    | "spendingLimit"
    | "state"
    | "zip",
    string
  >
  form: Record<"selectCountry" | "selectCurrency", string>
  menuItem: string
  pagination: Record<"next" | "of" | "pages" | "previous" | "results", string>
  placeholders: Record<
    | "address"
    | "city"
    | "email"
    | "employeeEmail"
    | "firstName"
    | "lastName"
    | "logoUrl"
    | "name"
    | "phone"
    | "spendingLimit"
    | "state"
    | "zip",
    string
  >
  prompts: Record<"deleteDescription" | "deleteTitle", string>
  search: Record<"companies" | "customerGroups", string>
  status: Record<"active" | "deleted" | "empty" | "loading" | "saving", string>
  toasts: Record<
    | "approvalSettingsUpdated"
    | "companyAddedToCustomerGroup"
    | "companyDeleted"
    | "companyRestored"
    | "companyRemovedFromCustomerGroup"
    | "companyUpdated"
    | "employeeCreated"
    | "employeeDeleted"
    | "employeeLinked"
    | "employeeUpdated",
    string
  >
  validation: Record<"required", string>
}

export const companyAdminI18n = {
  cs: {
    actions: {
      add: "Přidat",
      cancel: "Zrušit",
      createCompany: "Vytvořit firmu",
      delete: "Smazat",
      edit: "Upravit",
      editCustomerDetails: "Upravit detaily zákazníka",
      editDetails: "Upravit detaily",
      manageCustomerGroup: "Spravovat zákaznickou skupinu",
      restore: "Obnovit",
      save: "Uložit",
    },
    approvalSettings: {
      adminApprovalDescription:
        "Vyžadovat schválení administrátorem firmy pro všechny objednávky této firmy.",
      adminApprovalLabel: "Vyžaduje schválení administrátorem",
      badgeAdmin: "Vyžaduje schválení administrátorem",
      badgeNone: "Schválení není vyžadováno",
      badgeSalesManager: "Vyžaduje schválení obchodním manažerem",
      salesManagerApprovalDescription:
        "Vyžadovat schválení obchodním manažerem pro všechny objednávky této firmy.",
      salesManagerApprovalLabel: "Vyžaduje schválení obchodním manažerem",
      title: "Nastavení schvalování firmy",
    },
    columns: {
      actions: "Akce",
      address: "Adresa",
      approvalSettings: "Nastavení schvalování",
      city: "Město",
      company: "Firma",
      currency: "Měna",
      customerGroup: "Zákaznická skupina",
      email: "E-mail",
      employees: "Zaměstnanci",
      name: "Název",
      phone: "Telefon",
      spendingLimit: "Limit útraty",
      status: "Stav",
      state: "Kraj/stát",
    },
    customerGroup: {
      add: "Přidat",
      empty: "Nebyly nalezeny žádné zákaznické skupiny",
      hint: "Nastavení zákaznické skupiny pro firmu {{name}} automaticky synchronizuje {{count}} propojených zaměstnanců ve skupině.",
      linkedToCompanyTooltip:
        "Tato zákaznická skupina je propojena s firmou {{name}}.",
      remove: "Odebrat",
      set: "Nastavit",
      title: "Nastavit zákaznickou skupinu pro {{name}}",
      titleFallback: "Nastavit zákaznickou skupinu firmy",
    },
    employees: {
      adminBadge: "Admin",
      adminDescription: "Zapnutím udělíte administrátorský přístup",
      adminLabel: "Administrátorský přístup",
      adminTooltip:
        "Administrátoři mohou spravovat detaily firmy a oprávnění zaměstnanců.",
      createTitle: "Přidat zaměstnance",
      details: "Detaily",
      editTitle: "Upravit zaměstnance",
      emptyMessage: "Tato firma nemá žádné zaměstnance.",
      emptyTitle: "Žádné záznamy",
      firstName: "Jméno",
      lastName: "Příjmení",
      permissions: "Oprávnění",
      spendingLimitWithCurrency: "Limit útraty ({{currency}})",
      title: "Zaměstnanci",
    },
    errors: {
      companyNotFound: "Firma nebyla nalezena",
      createCompanyFailed: "Firmu se nepodařilo vytvořit",
      createCustomerFailed: "Zákazníka se nepodařilo vytvořit",
      createEmployeeFailed: "Zaměstnance se nepodařilo vytvořit",
      loadCustomerGroupsFailed: "Zákaznické skupiny se nepodařilo načíst",
      missingEmployeeDetails: "Chybí povinné údaje zaměstnance",
      removeCustomerGroupFailed:
        "Firmu se nepodařilo odebrat ze zákaznické skupiny",
      restoreCompanyFailed: "Firmu se nepodařilo obnovit",
      saveErrorPrefix: "Chyba:",
      saving: "Ukládám...",
      updateApprovalSettingsFailed:
        "Nastavení schvalování firmy se nepodařilo uložit",
      updateCompanyFailed: "Firmu se nepodařilo upravit",
      updateCustomerGroupFailed:
        "Zákaznickou skupinu firmy se nepodařilo nastavit",
      updateEmployeeFailed: "Zaměstnance se nepodařilo upravit",
    },
    fields: {
      address: "Adresa firmy",
      city: "Město firmy",
      country: "Země firmy",
      currency: "Měna",
      email: "E-mail firmy",
      logoUrl: "URL loga firmy",
      name: "Název firmy",
      phone: "Telefon firmy",
      spendingLimit: "Limit útraty",
      state: "Kraj/stát firmy",
      zip: "PSČ firmy",
    },
    form: {
      selectCountry: "Vyberte zemi",
      selectCurrency: "Vyberte měnu",
    },
    menuItem: "Firmy",
    pagination: {
      next: "Další",
      of: "z",
      pages: "stran",
      previous: "Předchozí",
      results: "výsledků",
    },
    placeholders: {
      address: "Václavské náměstí 1",
      city: "Praha",
      email: "firma@example.com",
      employeeEmail: "jan.novak@example.com",
      firstName: "Jan",
      lastName: "Novák",
      logoUrl: "https://example.com/logo.png",
      name: "Medusa",
      phone: "+420 123 456 789",
      spendingLimit: "1000",
      state: "Praha",
      zip: "110 00",
    },
    prompts: {
      deleteDescription:
        "Opravdu chcete tuto firmu smazat? Firmu bude možné později obnovit.",
      deleteTitle: "Potvrdit smazání",
    },
    search: {
      companies: "Hledat firmy",
      customerGroups: "Hledat zákaznické skupiny",
    },
    status: {
      active: "Aktivní",
      deleted: "Smazáno",
      empty: "Nebyly nalezeny žádné firmy",
      loading: "Načítám...",
      saving: "Ukládám...",
    },
    toasts: {
      approvalSettingsUpdated: "Nastavení schvalování firmy bylo uloženo",
      companyAddedToCustomerGroup: "Zákaznická skupina firmy byla nastavena",
      companyDeleted: "Firma {{name}} byla smazána",
      companyRestored: "Firma {{name}} byla obnovena",
      companyRemovedFromCustomerGroup:
        "Firma byla odebrána ze zákaznické skupiny",
      companyUpdated: "Firma {{name}} byla upravena",
      employeeCreated: "Zaměstnanec {{name}} byl vytvořen",
      employeeDeleted: "Zaměstnanec byl smazán",
      employeeLinked:
        "Existující zákazník {{name}} byl přidán jako zaměstnanec",
      employeeUpdated: "Zaměstnanec {{email}} byl upraven",
    },
    validation: {
      required: "Toto pole je povinné",
    },
  },
  en: {
    actions: {
      add: "Add",
      cancel: "Cancel",
      createCompany: "Create Company",
      delete: "Delete",
      edit: "Edit",
      editCustomerDetails: "Edit Customer Details",
      editDetails: "Edit details",
      manageCustomerGroup: "Manage customer group",
      restore: "Restore",
      save: "Save",
    },
    approvalSettings: {
      adminApprovalDescription:
        "Require company admin approval for all orders placed by this company.",
      adminApprovalLabel: "Requires Admin Approval",
      badgeAdmin: "Requires admin approval",
      badgeNone: "No approval required",
      badgeSalesManager: "Requires sales manager approval",
      salesManagerApprovalDescription:
        "Require sales manager approval for all orders placed by this company.",
      salesManagerApprovalLabel: "Requires Sales Manager Approval",
      title: "Company Approval Settings",
    },
    columns: {
      actions: "Actions",
      address: "Address",
      approvalSettings: "Approval Settings",
      city: "City",
      company: "Company",
      currency: "Currency",
      customerGroup: "Customer Group",
      email: "Email",
      employees: "Employees",
      name: "Name",
      phone: "Phone",
      spendingLimit: "Spending Limit",
      status: "Status",
      state: "State",
    },
    customerGroup: {
      add: "Add",
      empty: "No customer groups found",
      hint: "Setting a customer group for {{name}} will automatically sync {{count}} linked employee(s) in the group.",
      linkedToCompanyTooltip: "This customer group is linked to {{name}}.",
      remove: "Remove",
      set: "Set",
      title: "Set Customer Group for {{name}}",
      titleFallback: "Set Company Customer Group",
    },
    employees: {
      adminBadge: "Admin",
      adminDescription: "Enable to grant admin access",
      adminLabel: "Admin Access",
      adminTooltip:
        "Admins can manage the company's details and employee permissions.",
      createTitle: "Add Employee",
      details: "Details",
      editTitle: "Edit Employee",
      emptyMessage: "This company doesn't have any employees.",
      emptyTitle: "No records",
      firstName: "First Name",
      lastName: "Last Name",
      permissions: "Permissions",
      spendingLimitWithCurrency: "Spending Limit ({{currency}})",
      title: "Employees",
    },
    errors: {
      companyNotFound: "Company not found",
      createCompanyFailed: "Failed to create company",
      createCustomerFailed: "Failed to create customer",
      createEmployeeFailed: "Failed to create employee",
      loadCustomerGroupsFailed: "Failed to load customer groups",
      missingEmployeeDetails: "Missing required employee details",
      removeCustomerGroupFailed: "Failed to remove company from customer group",
      restoreCompanyFailed: "Failed to restore company",
      saveErrorPrefix: "Error:",
      saving: "Saving...",
      updateApprovalSettingsFailed:
        "Failed to update company approval settings",
      updateCompanyFailed: "Failed to update company",
      updateCustomerGroupFailed: "Failed to set company customer group",
      updateEmployeeFailed: "Failed to update employee",
    },
    fields: {
      address: "Company Address",
      city: "Company City",
      country: "Company Country",
      currency: "Currency",
      email: "Company Email",
      logoUrl: "Company Logo URL",
      name: "Company Name",
      phone: "Company Phone",
      spendingLimit: "Spending Limit",
      state: "Company State",
      zip: "Company Zip",
    },
    form: {
      selectCountry: "Select a country",
      selectCurrency: "Select a currency",
    },
    menuItem: "Companies",
    pagination: {
      next: "Next",
      of: "of",
      pages: "pages",
      previous: "Previous",
      results: "results",
    },
    placeholders: {
      address: "1234 Main St",
      city: "New York",
      email: "medusa@medusa.com",
      employeeEmail: "john.doe@example.com",
      firstName: "John",
      lastName: "Doe",
      logoUrl: "https://example.com/logo.png",
      name: "Medusa",
      phone: "1234567890",
      spendingLimit: "1000",
      state: "NY",
      zip: "10001",
    },
    prompts: {
      deleteDescription:
        "Are you sure you want to delete this company? You can restore it later.",
      deleteTitle: "Confirm Deletion",
    },
    search: {
      companies: "Search companies",
      customerGroups: "Search customer groups",
    },
    status: {
      active: "Active",
      deleted: "Deleted",
      empty: "No companies found",
      loading: "Loading...",
      saving: "Saving...",
    },
    toasts: {
      approvalSettingsUpdated: "Company approval settings updated successfully",
      companyAddedToCustomerGroup: "Company customer group set successfully",
      companyDeleted: "Company {{name}} deleted successfully",
      companyRestored: "Company {{name}} restored successfully",
      companyRemovedFromCustomerGroup:
        "Company removed from customer group successfully",
      companyUpdated: "Company {{name}} updated successfully",
      employeeCreated: "Employee {{name}} created successfully",
      employeeDeleted: "Employee deleted successfully",
      employeeLinked: "Existing customer {{name}} linked as employee",
      employeeUpdated: "Employee {{email}} updated successfully",
    },
    validation: {
      required: "This field is required",
    },
  },
} satisfies Record<"cs" | "en", CompanyAdminI18nNamespace>
