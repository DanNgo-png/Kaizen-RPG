Reusable JSON Database Structure Template
This template uses a schema inspired by the JSON:API specification, which promotes consistency and scalability. It's designed to be adaptable for any of the files listed above.
```
{
  "_meta": {
    "version": "1.0.0",
    "description": "A brief description of the data stored in this file (e.g., 'User profile and preferences').",
    "createdAt": "2025-12-06T10:00:00Z",
    "updatedAt": "2025-12-06T10:00:00Z"
  },
  "data": [
    {
      "id": "unique-identifier-1",
      "type": "dataType",
      "attributes": {
        "key1": "value1",
        "key2": true,
        "key3": 123,
        "nestedObject": {
          "nestedKey": "nestedValue"
        }
      },
      "relationships": {
        "relatedEntity1": {
          "data": { "type": "relatedEntityType", "id": "related-id-1" }
        }
      }
    },
    {
      "id": "unique-identifier-2",
      "type": "dataType",
      "attributes": {
        "key1": "value4",
        "key2": false,
        "key3": 456
      },
      "relationships": {}
    }
  ]
}
```
Key Concepts of this Structure:
1. _meta: An object containing metadata about the collection itself, such as version and timestamps. This is useful for debugging and data migration.
2. data: An array that holds the primary data records as objects.
3. id: A unique identifier for each data record, making it easy to fetch, update, or delete specific entries.
4. type: A string that defines the nature of the object (e.g., "user", "quest", "focus-session"). This helps differentiate between various kinds of data.
5. attributes: An object containing the primary data (the actual properties) of the record.
6. relationships: An object that defines connections to other data records. This is a powerful feature for creating a scalable and interconnected data model, reducing data duplication. For example, a quest could have a relationship to an item in the inventory.json file.