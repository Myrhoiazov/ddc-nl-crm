import webpack, { DefinePlugin, RuleSetRule } from 'webpack';
import path from 'path';
import { IBuildPath } from '../build/types/config';
import { buildCssLoaders } from '../build/loaders/buildCssLoaders';

export default ({ config }: { config: webpack.Configuration }) => {

    const paths: IBuildPath = {
        entry: '',
        build: '',
        html: '',
        src: path.resolve(__dirname, '..', '..', 'src'),
    };

    config.resolve!.modules!.push(paths.src);
    config.resolve!.extensions!.push('.ts', '.tsx');

    config.module?.rules?.push(buildCssLoaders(true));


    config.module!.rules = config.module!.rules!.filter((rule): rule is RuleSetRule => rule !== false && rule !== null && rule !== undefined).map((rule: RuleSetRule) => {
        if (rule.test && rule.test.toString().includes('svg')) {
            return {
                ...rule,
                exclude: /\.svg$/,
            };
        }
        return rule;
    });
    config.module!.rules!.push({
        test: /\.svg$/,
        use: ['@svgr/webpack'],
    });

    config.plugins!.push(new DefinePlugin({
        __IS_DEV__: true,
        __API__: JSON.stringify(''),
        __PROJECT__: JSON.stringify('storybook'),
    }));

    return config;
}