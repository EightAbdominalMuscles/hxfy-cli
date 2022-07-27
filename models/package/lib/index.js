'use strict';

const path = require('path')
const fse = require('fs-extra')
const pkgDir = require('pkg-dir').sync
const pathExists = require('path-exists').sync
const npminstall = require('npminstall')

const { isObject } = require('@hxfy-cli/utils')
const { getDefaultRegistry, getNpmLatestVersion } = require('@hxfy-cli/get-npm-info')
const formatPath = require('@hxfy-cli/format-path')
class Package {
    constructor (options) {
        if (!options) {
            throw new Error('Package类的options参数不能为空！')
        }
        if (!isObject(options)) {
            throw new Error('Package类的options参数必须为对象！')
        }
        // package的路径
        this.targetPath = options.targetPath
        // package的缓存路径
        this.storeDir = options.storeDir
        // package的name
        this.packageName = options.packageName
        // package的verison
        this.packageVersion = options.packageVersion
        // package的缓存目录前缀
        this.cacheFilePathPrefix = this.packageName.replace('/', '_')
    }

    async prepare() {
        // 缓存目录不存在则创建
        if (this.storeDir && !pathExists(this.storeDir)) {
            fse.mkdirp(this.storeDir)
        }
        if (this.packageVersion === 'latest') {
            this.packageVersion = await getNpmLatestVersion(this.packageName)
        }
    }
    // 路径转换
    get cacheFilePath() {
        // _@hxfy-cli_init@1.1.2@@hxfy-cli/
        // @hxfy-cli/init 1.1.2
        // _@hxfy-cli@1.1.2@@hxfy-cli/
        return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`)
    }
    getSpecificCacheFilePath (packageVersion) {
        return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${packageVersion}@${this.packageName}`)
    }
    // 判断当前Package是否存在
    async exists() {
        if (this.storeDir) {
            await this.prepare();
            return pathExists(this.cacheFilePath);
        } else {
            return pathExists(this.targetPath);
        }
    }
    // 安装Package
    async install() {
        await this.prepare()
        npminstall({
            root: this.targetPath,
            storeDir: this.storeDir,
            registry: getDefaultRegistry(),
            pkgs: [{
              name: this.packageName,
              version: this.packageVersion,
            }],
          });
    }
    // 更新Package
    async update() {
        await this.prepare()
        // 1. 获取最新的npm模块版本号
        const latestPackageVersion = await getNpmLatestVersion(this.packageName)
        // 2. 查询最新版本号对应的路径是否存在
        const latestFilePath = this.getSpecificCacheFilePath(latestPackageVersion)
        // 3. 如果不存在，则直接安装最新版本
        if (!pathExists(latestFilePath)) {
          await npminstall({
                root: this.targetPath,
                storeDir: this.storeDir,
                registry: getDefaultRegistry(),
                pkgs: [{
                  name: this.packageName,
                  version: latestPackageVersion,
                }],
              });
            this.packageVersion = latestPackageVersion
        }else {
            this.packageVersion = latestPackageVersion
        }
    }
    // 获取入口文件的路径
    getRootFilePath () {
        function _getRootFile (targetPath) {
            // 1. 获取package.json 所在目录
            const dir = pkgDir(targetPath)
            if (dir) {
                // 2. 读取package.json 
                const pkgFile = require(path.resolve(dir, 'package.json'))
                // 3. 寻找main/lib
                if(pkgFile && pkgFile.main) {
                    // 4. 路径的兼容（macOS/windows）
                    return formatPath(path.resolve(dir, pkgFile.main))
                }
            }
            return null
        }
        if (this.storeDir) {
            return _getRootFile(this.cacheFilePath)
        } else {
            return _getRootFile(this.targetPath)
        }
    }
}
module.exports = Package;

