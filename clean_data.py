import pandas as pd

df = pd.read_csv('data.csv')

#Splits cells with multiple values (creates duplicates; can make it easier when creating visualisations and aggregating)
def expand(df, col):
    df[col] = df[col].apply(lambda x: x.split(", ") if isinstance(x, str) else [x])
    return df.explode(col, ignore_index=True)

for col in ['Countries', 'Country codes alpha 3', 'ISO639-3 codes']:
    df = expand(df, col)

df = df.drop(['Name in French', 'Name in Spanish', 'Sources', 'Description of the location'], axis=1) #Dropping columns not required for visualisations

df.to_csv('cleaned_data.csv', index=False)