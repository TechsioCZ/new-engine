import {
  AlignFeature,
  BlockquoteFeature,
  BoldFeature,
  ChecklistFeature,
  EXPERIMENTAL_TableFeature,
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  IndentFeature,
  InlineCodeFeature,
  ItalicFeature,
  LinkFeature,
  lexicalEditor,
  OrderedListFeature,
  ParagraphFeature,
  RelationshipFeature,
  StrikethroughFeature,
  SubscriptFeature,
  SuperscriptFeature,
  UnderlineFeature,
  UnorderedListFeature,
  UploadFeature,
} from "@payloadcms/richtext-lexical"

/** Create a shared Lexical editor configuration for CMS rich text fields. */
export const createLexicalEditor = () => {
  return lexicalEditor({
    features: [
      // Essential formatting features
      ParagraphFeature(),
      HeadingFeature({
        enabledHeadingSizes: ["h1", "h2", "h3", "h4", "h5", "h6"],
      }),
      BoldFeature(),
      ItalicFeature(),
      UnderlineFeature(),
      StrikethroughFeature(),
      SubscriptFeature(),
      SuperscriptFeature(),
      InlineCodeFeature(),

      // List features
      UnorderedListFeature(),
      OrderedListFeature(),
      ChecklistFeature(),

      // Layout features
      IndentFeature(),
      AlignFeature(),
      BlockquoteFeature(),
      HorizontalRuleFeature(),

      EXPERIMENTAL_TableFeature(),

      // Link and relationship features
      LinkFeature({
        enabledCollections: [],
      }),
      RelationshipFeature({
        enabledCollections: [],
      }),

      // Upload feature for images
      UploadFeature({
        collections: {
          media: {
            fields: [
              {
                name: "alt",
                type: "text",
                required: true,
              },
            ],
          },
        },
      }),

      // Fixed toolbar to ensure toolbar is always visible
      FixedToolbarFeature(),
    ],
  })
}
