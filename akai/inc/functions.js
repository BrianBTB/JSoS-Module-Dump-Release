/*
   This file contains sample code
*/

/*
   Connect to ip on given port and
   send msg
*/


function socket_send(ip, port, msg){

    var scenet = libraries.SceNet.functions;
    var sockaddr = allocate_memory(32); 

    mymemset(sockaddr, 0, SIZEOF_SIN);

    aspace[sockaddr] = SIZEOF_SIN;
    aspace[sockaddr + 1] = SCE_NET_AF_INET;

    var PORT = port;
    logdbg("Calling nethtons()");
    var r = scenet.sceNetHtons(PORT); 
    logdbg("-> 0x" + r.toString(16) + "\n"); 
    aspace16[((sockaddr + 2) / 2)] = r;

    aspace32[(sockaddr + 4) / 4] = inet_addr(ip);

    var dbgname = "test_socket\x00";
    var dbgnameaddr = allocate_memory(dbgname.length);

    mymemcpy(dbgnameaddr, dbgname, dbgname.length);

    logdbg("Calling SceNetSocket()");
    var sockfd = scenet.sceNetSocket(dbgnameaddr, SCE_NET_AF_INET, SCE_NET_SOCK_STREAM, 0);
    logdbg("-> 0x" + sockfd.toString(16) + "\n"); 

    logdbg("Calling SceNetConnect()");
    var r = scenet.sceNetConnect(sockfd, sockaddr, SIZEOF_SIN); 
    logdbg("-> 0x" + r.toString(16) + "\n"); 

    var msgaddr = allocate_memory(msg.length);

    mymemcpy(msgaddr, msg, msg.length);

    logdbg("Calling SceNetSend()");
    var sent = scenet.sceNetSend(sockfd, msgaddr, msg.length, 0);
    logdbg("-> 0x" + sent.toString(16) + "\n"); 

    logdbg("Calling SceNetClose()");
    var sent = scenet.sceNetSocketClose(sockfd, 0, 0, 0);
    logdbg("-> 0x" + sent.toString(16) + "\n"); 
}

//SceDriverUser base + 0x3739
//ConvertVs0UserDrivePath
//sceAppMgrConvertVs0UserDrivePath
function sceAppMgrConvertVs0UserDrivePath_caller(caller){
    return function(path){
        MOUNT_PATH_LENGTH = 0x100;
        VS_PATH_LENGTH = path.length;
        var path_a = allocate_memory(VS_PATH_LENGTH);
        var mount_a = allocate_memory(MOUNT_PATH_LENGTH);
        mymemcpy(path_a,path,VS_PATH_LENGTH);
        var return_code = caller(path_a,mount_a,MOUNT_PATH_LENGTH);
        logdbg("DEBUG: return code: 0x"+return_code.toString(16));
        do_read(aspace,mount_a,MOUNT_PATH_LENGTH);
        do_read(aspace,path_a,VS_PATH_LENGTH);

        var mount = "broken (fixme)";
        return [return_code,mount];
    }

}


//thanks @nas_plugi
function sceSysmoduleLoadModule_caller(caller){
    return function (mod_id) {
        var return_code = caller(mod_id);
        return return_code;
    }
}

function sceKernelGetModuleInfo_caller(caller){
    return function (UID) {
        var SIZE_OF_MODINFO = 440;
        var m_mod_info_a = allocate_memory(SIZE_OF_MODINFO*4);
        var return_code = caller(UID,m_mod_info_a);
        var result = [return_code,m_mod_info_a];
        return result
    }
}
//sceKernelLoadStartModule = sceLibKernel base + 0x99D1


function sceKernelLoadModule_caller(caller){
    return function (path) {
        var MAX_LOADED_MODS = 128;
        var num_loaded = MAX_LOADED_MODS;
        var modlist_a = allocate_memory(MAX_LOADED_MODS*4);
        var num_loaded_a = allocate_memory(0x4);
        aspace32[num_loaded_a/4] = num_loaded;

        var return_code = caller(0xFF,modlist_a,num_loaded_a);
        var result = [return_code,modlist_a,num_loaded_a];


        return result
    }

}


function sceKernelGetModuleList_caller(caller){
    return function () {
        var MAX_LOADED_MODS = 128;
        var num_loaded = MAX_LOADED_MODS;
        var modlist_a = allocate_memory(MAX_LOADED_MODS*4);
        var num_loaded_a = allocate_memory(0x4);
        aspace32[num_loaded_a/4] = num_loaded;

        var return_code = caller(0xFF,modlist_a,num_loaded_a);
        var result = [return_code,modlist_a,num_loaded_a];


        return result
    }

}

/*
    List Directory
*/
function list_dir(dirname){
    var scekernel = libraries.SceLibKernel.functions;

    var dirname_a = allocate_memory(0x20);
    var dirlist = allocate_memory(0x1000);

    mymemcpy(dirname_a, dirname, dirname.length);

    var fd = scekernel.sceIoDopen(dirname_a);
    fd = Int(fd);
    if(fd < 0){
        logdbg("sceIoDopen() failed");
        return;
    }

    logdbg("Listing: " + dirname);
    while (scekernel.sceIoDread(fd, dirlist) > 0){
        myprintf(dirlist + 0x58);
    }
    logdbg("-\n");
}

/*
    Retrieve the file fname
    and save to dumps/loc_name
*/
function retrieve_file(fname, loc_name){
    var scelibc = libraries.SceLibc.functions;
    var BUFSIZE = 0x1000;

    var fname_a = allocate_memory(fname.length + 1);
    mymemcpy(fname_a, fname + "\x00", fname.length);

    var mode = "r";
    var mode_a = allocate_memory(mode.length + 1);
    mymemcpy(mode_a, mode + "\x00", mode.length);

    var fp = scelibc.fopen(fname_a, mode_a);
    fp = Int(fp);
    if(fp == 0){
        logdbg("fopen() failed");
        return; 
    }

    var buf = allocate_memory(BUFSIZE);
    var n = 0;
    while((n = scelibc.fread(buf, 1, BUFSIZE, fp)) > 0){
        logdbg("-> 0x" + n.toString(16));
        var bytes = get_bytes(aspace, buf, n);
        sendcmsg("dump", buf, bytes, loc_name); 
    }

}
