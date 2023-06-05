interface Array<T> {
  filter(predicate: BooleanConstructor): NonNullable<T>[];
}
