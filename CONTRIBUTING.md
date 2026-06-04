# Contributing Guidelines

## Code of Conduct
- Be respectful and inclusive
- No harassment or discrimination
- Follow professional standards

## How to Contribute

### Reporting Issues
1. Check if issue already exists
2. Provide detailed description
3. Include steps to reproduce
4. Attach logs or screenshots

### Submitting Changes
1. Fork the repository if needed
2. Create a feature branch for the change
3. Make changes following code style
4. Add tests for new functionality
5. Commit with a clear, descriptive message
6. Push the branch to your remote
7. Create a pull request

### Code Style
- Use TypeScript strict mode
- Follow ESLint rules
- Consistent naming conventions
- Comments for complex logic
- Keep notes and comments specific and complete

### Testing Requirements
- Unit tests for all services
- Integration tests for workflows
- Minimum 80% code coverage
- All tests passing before PR

### Documentation
- Update README.md if needed
- Document API changes
- Add code comments for complex logic
- Update CHANGELOG.md

## Git Workflow

Use a feature branch, keep commits focused, push to your remote, and open a pull request for review.

## Development Setup

```bash
# Clone the repository locally

# Install dependencies
cd SecureFace-Offline/mobile-app
npm install

cd ../backend
npm install

# Run setup script
bash ../scripts/setup-dev.sh
```

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- filename.test.ts

# Generate coverage report
npm test -- --coverage

# Run integration tests
npm test -- --testPathPattern=integration
```

## Pull Request Process

1. Update documentation
2. Add tests for new features
3. Ensure all tests pass
4. Update CHANGELOG.md
5. Link related issues
6. Request review from maintainers
7. Address feedback

## Code Review

- Review for correctness
- Check code style compliance
- Verify test coverage
- Check documentation
- Performance implications

## Release Process

1. Update version in package.json
2. Update CHANGELOG.md
3. Tag release: `git tag v1.0.0`
4. Push tags: `git push --tags`
5. Create GitHub release
6. Build and upload artifacts

## Questions?

- Open an issue for questions
- Check documentation first
- Use discussion forums
- Contact maintainers

## Recognition

Contributors will be recognized in:
- README.md CONTRIBUTORS section
- Release notes
- GitHub contributors list

Thank you for contributing!
